import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateProject } from '../src';
import { loadApiKitConfig } from '../src/compiler/load-config';

describe('generated services with hooks', () => {
  it('emits direct hook imports and explicit await calls inside the transactional service method', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-hooks');
    const generatedOutputDir = path.join(fixtureDir, 'src', 'generated');
    const previousCwd = process.cwd();

    await fs.rm(generatedOutputDir, { recursive: true, force: true });
    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      await generateProject(config);

      const serviceSource = await fs.readFile(path.join(generatedOutputDir, 'api', 'users', 'users.service.ts'), 'utf8');
      const indexSource = await fs.readFile(path.join(generatedOutputDir, 'api', 'users', 'index.ts'), 'utf8');
      const metadataSource = await fs.readFile(path.join(generatedOutputDir, 'api', 'users', 'users.resource.metadata.ts'), 'utf8');
      const querySource = await fs.readFile(path.join(generatedOutputDir, 'api', 'users', 'users.query.ts'), 'utf8');

      expect(serviceSource).toContain("import measureExecution from '../../../resources/hooks/measure-execution';");
      expect(serviceSource).toContain("import attachAuditStamp from '../../../resources/hooks/attach-audit-stamp';");
      expect(serviceSource).toContain("import normalizeUserInput from '../../../resources/hooks/normalize-user-input';");
      expect(serviceSource).toContain("import publishCreatedEvent from '../../../resources/hooks/publish-created-event';");
      expect(serviceSource).toContain('return this.db.transaction(async (tx) => {');
      expect(serviceSource).toContain('// Attach audit metadata to the validated create input.');
      expect(serviceSource).toContain('// Normalize the create payload before persisting it.');
      expect(serviceSource).toContain('db: tx,');
      expect(serviceSource).toContain('await measureExecution(context);');
      expect(serviceSource).toContain('await attachAuditStamp(context);');
      expect(serviceSource).toContain('await normalizeUserInput(context);');
      expect(serviceSource).toContain('const rows = await tx.insert(users).values(context.input).returning();');
      expect(serviceSource).toContain('await publishCreatedEvent(context);');
      expect(serviceSource).toContain('context.result = rows[0] as CreateUserOutputDto;');
      expect(indexSource).not.toContain('&#39;');
      expect(indexSource).toContain("export * from './users.module';");
      expect(metadataSource).not.toContain('&#39;');
      expect(metadataSource).toContain('tags: ["Users"]');
      expect(querySource).not.toContain('buildAllowedColumnCondition');
    } finally {
      process.chdir(previousCwd);
      await fs.rm(generatedOutputDir, { recursive: true, force: true });
    }
  }, 20000);
});
