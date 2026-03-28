import path from 'node:path';
import type { ResourceDefinition } from './types';

export const API_KIT_RESOURCE_META_KEY = '__apiKitResourceMeta';

function normalizeStackFilePath(filePath: string): string {
  const withoutFileProtocol = filePath.startsWith('file:///')
    ? filePath.slice('file:///'.length)
    : filePath;

  const normalizedSlashes = withoutFileProtocol.replace(/\//g, path.sep);
  return path.normalize(normalizedSlashes);
}

function resolveCallerFile(): string | undefined {
  const stack = new Error().stack?.split('\n') ?? [];
  const currentFile = path.normalize(__filename);

  for (const line of stack.slice(1)) {
    const match = line.match(/(?:\()?(file:\/\/\/)?([A-Za-z]:[\\/][^():]+?\.[cm]?[jt]sx?|\/[^():]+?\.[cm]?[jt]sx?):\d+:\d+\)?$/i);
    if (!match) {
      continue;
    }

    const callerPath = match[2];
    if (!callerPath) {
      continue;
    }

    const filePath = normalizeStackFilePath(callerPath);
    if (filePath !== currentFile && !filePath.endsWith(`${path.sep}definition${path.sep}define-resource.ts`)) {
      return filePath;
    }
  }

  return undefined;
}

export function defineResource<const T extends ResourceDefinition>(definition: T): T {
  const sourceFile = resolveCallerFile();
  if (sourceFile) {
    Object.defineProperty(definition, API_KIT_RESOURCE_META_KEY, {
      value: { sourceFile },
      enumerable: false,
      configurable: false,
      writable: false,
    });
  }

  return definition;
}
