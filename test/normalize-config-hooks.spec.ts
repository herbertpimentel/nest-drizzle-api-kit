import { describe, expect, it } from 'vitest';
import { importConfigFile } from '../src/compiler/load-config';
import { normalizeApiKitConfig } from '../src/compiler/normalize-config';
import { resolveConfigHooksSource } from '../src/compiler/resource-source';

describe('normalizeApiKitConfig hooks', () => {
  it('resolves imported config hooks and normalizes explicit hook calls', async () => {
    const config = await importConfigFile('./test/fixtures/load-config-hooks/nest-drizzle-api-kit.config.ts');
    const source = resolveConfigHooksSource(config);
    const normalized = normalizeApiKitConfig(config);

    expect(source?.accessExpression).toBe('globalHooks');
    expect(normalized.hooks?.before[0]?.suggestedName).toBe('measureExecution');
    expect(normalized.hooks?.endpoints.create.before[0]?.suggestedName).toBe('attachAuditStamp');
    expect(normalized.hooks?.endpoints.create.before[0]?.description).toBe('Attach audit metadata to the validated create input.');
    expect(normalized.resources[0]?.endpoints.create.transactional).toBe(true);
    expect(normalized.resources[0]?.hooks?.endpoints.create.before[0]?.suggestedName).toBe('normalizeUserInput');
    expect(normalized.resources[0]?.hooks?.endpoints.create.after[0]?.suggestedName).toBe('publishCreatedEvent');
  });
});
