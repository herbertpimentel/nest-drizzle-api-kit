import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadApiKitConfig } from '../src/compiler/load-config';
import { normalizeApiKitConfig } from '../src/compiler/normalize-config';

describe('loadApiKitConfig', () => {
  it('loads a ts config that uses extensionless relative imports', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-extensionless');
    const previousCwd = process.cwd();

    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();

      expect(config.outputPath).toBe('./src/generated/api');
      expect(config.dbProviderToken).toBe('DATABASE');
      expect(config.resources).toHaveLength(1);
      expect(config.resources[0]?.name).toBe('custas');
    } finally {
      process.chdir(previousCwd);
    }
  }, 20000);

  it('preserves config source metadata so dbSchema can narrow generated DB types', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-schema');
    const previousCwd = process.cwd();

    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      const normalized = normalizeApiKitConfig(config);

      expect(normalized.dbSchemaSource).toEqual({
        sourceFile: path.join(fixtureDir, 'src', 'db'),
        accessExpression: 'schema',
        importKind: 'named',
        importName: 'schema',
        importSourceName: 'schema',
      });
    } finally {
      process.chdir(previousCwd);
    }
  }, 20000);

  it('accepts pagination: false and normalizes it to a disabled pagination config', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-pagination-disabled');
    const previousCwd = process.cwd();

    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      const normalized = normalizeApiKitConfig(config);

      expect(normalized.resources[0]?.query.pagination).toEqual({
        enabled: false,
        defaultPage: 1,
        defaultPageSize: 20,
        maxPageSize: 100,
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('accepts pagination: true and normalizes it to the default pagination config', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-pagination-enabled');
    const previousCwd = process.cwd();

    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      const normalized = normalizeApiKitConfig(config);

      expect(normalized.resources[0]?.query.pagination).toEqual({
        enabled: true,
        defaultPage: 1,
        defaultPageSize: 20,
        maxPageSize: 100,
      });
    } finally {
      process.chdir(previousCwd);
    }
  });
});
