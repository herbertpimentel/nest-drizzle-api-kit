import type { NormalizedApiKitConfig, NormalizedResourceDefinition } from '../compiler/models';
import { buildResourceTemplateContext } from './template-context';
import { runHygen } from './hygen';

export async function generateResourceFiles(
  config: NormalizedApiKitConfig,
  resource: NormalizedResourceDefinition,
): Promise<void> {
  const context = buildResourceTemplateContext(config, resource);
  await runHygen({
    generator: 'resource',
    action: 'new',
    context,
  });
}
