import { generateProject } from '../generator/generate-project';
import { loadApiKitConfig } from '../compiler/load-config';
import { normalizeApiKitConfig } from '../compiler/normalize-config';
import { removeDir } from '../generator/file-utils';

function providerInstruction(token: string | undefined): string {
  const resolved = token?.trim() || 'YOUR_DB_TOKEN';
  return `Target project requirement: register a Nest provider for ${JSON.stringify(resolved)} before using the generated services.`;
}

export async function generateCommand(configPath?: string): Promise<void> {
  const config = await loadApiKitConfig(configPath);
  await generateProject(config);
  const normalized = normalizeApiKitConfig(config);
  process.stdout.write(`Generated ${normalized.resources.length} resource(s) into ${normalized.outputPath} using Hygen templates.
${providerInstruction(normalized.dbProviderToken)}
`);
}

export async function checkCommand(configPath?: string): Promise<void> {
  const config = await loadApiKitConfig(configPath);
  const normalized = normalizeApiKitConfig(config);
  process.stdout.write(`Configuration is valid for ${normalized.resources.length} resource(s).
${providerInstruction(normalized.dbProviderToken)}
`);
}

export async function cleanCommand(configPath?: string): Promise<void> {
  const config = await loadApiKitConfig(configPath);
  const normalized = normalizeApiKitConfig(config);
  await removeDir(normalized.outputPath);
  process.stdout.write(`Removed ${normalized.outputPath}
`);
}
