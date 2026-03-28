import type { NormalizedApiKitConfig } from '../compiler/models';
import { buildRootTemplateContext } from './template-context';
import { runHygen } from './hygen';

export async function generateRootModule(config: NormalizedApiKitConfig): Promise<void> {
  const context = buildRootTemplateContext(config);
  await runHygen({
    generator: 'root',
    action: 'new',
    context,
  });
}
