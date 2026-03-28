import path from 'node:path';
import type { ApiKitConfig } from '../definition/types';
import { normalizeApiKitConfig } from '../compiler/normalize-config';
import { removeDir } from './file-utils';
import { generateResourceFiles } from './generate-resource-files';
import { generateRootModule } from './generate-root-module';
import { normalizeGeneratedFiles, runPostGenerateCommand } from './post-generate';

export async function generateProject(config: ApiKitConfig): Promise<void> {
  const normalized = normalizeApiKitConfig(config);
  const absoluteOutputPath = path.resolve(process.cwd(), normalized.outputPath);

  if (normalized.cleanOutput) {
    await removeDir(absoluteOutputPath);
  }

  const absoluteConfig = {
    ...normalized,
    outputPath: absoluteOutputPath,
  };

  for (const resource of absoluteConfig.resources) {
    await generateResourceFiles(absoluteConfig, resource);
  }

  await generateRootModule(absoluteConfig);
  await normalizeGeneratedFiles(absoluteOutputPath);

  if (absoluteConfig.postGenerateCommand) {
    await runPostGenerateCommand(absoluteConfig.postGenerateCommand, process.cwd());
  }
}
