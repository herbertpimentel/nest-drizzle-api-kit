import path from 'node:path';
import fg from 'fast-glob';
import { createJiti } from 'jiti';
import { API_KIT_CONFIG_META_KEY } from '../definition/define-api-kit-config';
import type { ApiKitConfig, ResourceDefinition } from '../definition/types';

const jiti = createJiti(__filename, {
  fsCache: false,
  interopDefault: false,
  moduleCache: false,
});

function isResourceDefinition(value: unknown): value is ResourceDefinition {
  return !!value && typeof value === 'object' && 'name' in value && 'table' in value;
}

export async function importConfigFile(configPath: string): Promise<ApiKitConfig> {
  const absolutePath = path.resolve(process.cwd(), configPath);
  const mod = await jiti.import<Record<string, unknown>>(absolutePath);
  const config = (mod.default ?? mod.config) as ApiKitConfig | undefined;
  if (!config) {
    throw new Error(`No default export config found in "${configPath}".`);
  }
  Object.defineProperty(config, API_KIT_CONFIG_META_KEY, {
    value: { sourceFile: absolutePath },
    configurable: false,
    enumerable: false,
    writable: false,
  });
  return config;
}

export async function resolveResources(resources: Array<ResourceDefinition> | Array<string>): Promise<ResourceDefinition[]> {
  const results: ResourceDefinition[] = [];

  for (const entry of resources) {
    if (typeof entry !== 'string') {
      results.push(entry);
      continue;
    }

    const files = await fg(entry, { cwd: process.cwd(), absolute: true });
    for (const file of files) {
      const mod = await jiti.import<Record<string, unknown>>(file);
      for (const value of Object.values(mod)) {
        if (isResourceDefinition(value)) {
          results.push(value);
        }
      }
      if (mod.default && isResourceDefinition(mod.default)) {
        results.push(mod.default);
      }
    }
  }

  return results;
}

export async function loadApiKitConfig(configPath = 'nest-drizzle-api-kit.config.ts'): Promise<ApiKitConfig> {
  const config = await importConfigFile(configPath);
  const resolvedResources = await resolveResources(config.resources);
  const loadedConfig = {
    ...config,
    resources: resolvedResources,
  };
  const meta = (config as ApiKitConfig & { [API_KIT_CONFIG_META_KEY]?: { sourceFile?: string } })[API_KIT_CONFIG_META_KEY];
  if (meta) {
    Object.defineProperty(loadedConfig, API_KIT_CONFIG_META_KEY, {
      value: meta,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }
  return loadedConfig;
}
