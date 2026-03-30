import { describe, expect, it } from 'vitest';
import { importConfigFile } from '../src/compiler/load-config';
import { normalizeApiKitConfig } from '../src/compiler/normalize-config';

describe('normalizeApiKitConfig hooks', () => {
  it('normalizes config and resource hook paths into explicit hook calls', async () => {
    const config = await importConfigFile('./test/fixtures/load-config-hooks/nest-drizzle-api-kit.config.ts');
    const normalized = normalizeApiKitConfig(config);

    expect(normalized.hooks?.before[0]?.suggestedName).toBe('measureExecution');
    expect(normalized.hooks?.functions.create.before[0]?.suggestedName).toBe('attachAuditStamp');
    expect(normalized.hooks?.functions.create.before[0]?.description).toBe('Attach audit metadata to the validated create input.');
    expect(normalized.resources[0]?.functions.create.transactional).toBe(true);
    expect(normalized.resources[0]?.functions.create.hooks.before[0]?.suggestedName).toBe('normalizeUserInput');
    expect(normalized.resources[0]?.functions.create.hooks.after[0]?.suggestedName).toBe('publishCreatedEvent');
  });
});
