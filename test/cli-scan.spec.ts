import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadApiKitConfig } from '../src/compiler/load-config';
import { discoverDrizzleTables, scaffoldScannedResources } from '../src/cli/scan';

describe('scanCommand helpers', () => {
  it('discovers drizzle tables, scaffolds resources, and updates the config file', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/scan-project');
    const configPath = path.join(fixtureDir, 'nest-drizzle-api-kit.config.ts');
    const previousCwd = process.cwd();
    const usersResourcePath = path.join(fixtureDir, 'src', 'resources', 'users.resource.ts');
    const postsResourcePath = path.join(fixtureDir, 'src', 'resources', 'posts.resource.ts');
    const originalConfigText = await fs.readFile(configPath, 'utf8');

    await fs.rm(usersResourcePath, { force: true });
    await fs.rm(postsResourcePath, { force: true });
    process.chdir(fixtureDir);

    try {
      const tables = await discoverDrizzleTables();
      expect(tables.map((table) => table.tableExportName)).toEqual(['posts', 'users']);

      const result = await scaffoldScannedResources('nest-drizzle-api-kit.config.ts', tables);
      expect(result.createdFiles).toEqual(['./src/resources/posts.resource.ts', './src/resources/users.resource.ts']);
      expect(result.updatedConfigEntries).toBe(2);

      const configText = await fs.readFile(configPath, 'utf8');
      expect(configText).toContain("'./src/resources/posts.resource.ts'");
      expect(configText).toContain("'./src/resources/users.resource.ts'");

      const usersResourceText = await fs.readFile(usersResourcePath, 'utf8');
      expect(usersResourceText).toContain("import { defineResource } from 'nest-drizzle-api-kit';");
      expect(usersResourceText).toContain("import { users } from '../db/users';");
      expect(usersResourceText).toContain("export const usersResource = defineResource({");
      expect(usersResourceText).toContain("name: 'user'");
      expect(usersResourceText).toContain('table: users');

      const loadedConfig = await loadApiKitConfig();
      expect(loadedConfig.resources).toHaveLength(2);
    } finally {
      process.chdir(previousCwd);
      await fs.writeFile(configPath, originalConfigText, 'utf8');
      await fs.rm(usersResourcePath, { force: true });
      await fs.rm(postsResourcePath, { force: true });
    }
  }, 20000);
});
