import fs from 'node:fs/promises';
import path from 'node:path';

export function resolveConfigPath(configPath?: string): {
  inputPath: string;
  absolutePath: string;
} {
  const inputPath = configPath ?? 'nest-drizzle-api-kit.config.ts';
  return {
    inputPath,
    absolutePath: path.resolve(process.cwd(), inputPath),
  };
}

export async function ensureConfigFileExists(configPath?: string): Promise<string> {
  const { inputPath, absolutePath } = resolveConfigPath(configPath);

  try {
    await fs.access(absolutePath);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'ENOENT') {
      throw new Error(
        `Could not find config file "${inputPath}". Run "nest-drizzle-api-kit init" first or pass an explicit config path.`,
      );
    }

    throw error;
  }

  return inputPath;
}
