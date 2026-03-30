import { describe, expect, it } from 'vitest';
import { importConfigFile } from '../src/compiler/load-config';
import { normalizeApiKitConfig } from '../src/compiler/normalize-config';
import { resolveValidationEngineSource } from '../src/compiler/resource-source';
import { validationUsersResource } from './fixtures/resource-source/validation-users.resource';

describe('normalizeApiKitConfig validation', () => {
  it('defaults the validation engine to zod when a resource defines validation schemas', () => {
    const normalized = normalizeApiKitConfig({
      outputPath: './src/generated/api',
      dbProviderToken: 'DATABASE',
      resources: [validationUsersResource],
    });

    expect(normalized.validation?.engineName).toBe('zod');
    expect(normalized.resources[0]?.validation?.schemaSource.accessExpression).toBe('userValidationSchemas');
  });

  it('resolves imported custom validation engines from the config file', async () => {
    const config = await importConfigFile('./test/fixtures/validation-engine/nest-drizzle-api-kit.config.ts');
    const source = resolveValidationEngineSource(config);
    const normalized = normalizeApiKitConfig(config);

    expect(source?.kind).toBe('custom');
    expect(source && 'accessExpression' in source ? source.accessExpression : undefined).toBe('customValidationEngine');
    expect(normalized.validation?.engineName).toBe('custom');
  });
});
