import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { initCommand } from '../src/cli/init';
import { loadApiKitConfig } from '../src/compiler/load-config';

describe('initCommand', () => {
  it('scaffolds a first-run config even when no resource files exist yet', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/init-project');
    const configPath = path.join(fixtureDir, 'nest-drizzle-api-kit.config.ts');
    const previousCwd = process.cwd();

    await fs.rm(configPath, { force: true });
    process.chdir(fixtureDir);

    try {
      await initCommand();

      const configText = await fs.readFile(configPath, 'utf8');
      expect(configText).toContain("outputPath: './src/resources/generated/api'");
      expect(configText).toContain("dbProviderToken: 'database_connection'");
      expect(configText).toContain("dbSchema: './src/db/db'");
      expect(configText).toContain('resources: [');
      expect(configText).not.toContain('.resource.ts');

      const loadedConfig = await loadApiKitConfig();
      expect(loadedConfig.resources).toHaveLength(0);
      expect(loadedConfig.dbProviderToken).toBe('database_connection');
      expect(loadedConfig.dbSchema).toBe('./src/db/db');
    } finally {
      process.chdir(previousCwd);
      await fs.rm(configPath, { force: true });
    }
  }, 20000);

  it('refuses a second init run and points the user to scan', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/init-project');
    const configPath = path.join(fixtureDir, 'nest-drizzle-api-kit.config.ts');
    const previousCwd = process.cwd();

    await fs.writeFile(
      configPath,
      "import { defineApiKitConfig } from 'nest-drizzle-api-kit';\n\nexport default defineApiKitConfig({ outputPath: './src/resources/generated/api', dbProviderToken: 'DATABASE', resources: [] });\n",
      'utf8',
    );
    process.chdir(fixtureDir);

    try {
      await expect(initCommand()).rejects.toThrow(/Use "nest-drizzle-api-kit scan" to add new resources\./);
    } finally {
      process.chdir(previousCwd);
      await fs.rm(configPath, { force: true });
    }
  });
});
