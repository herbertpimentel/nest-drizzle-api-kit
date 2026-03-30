import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateProject } from '../src';
import { loadApiKitConfig } from '../src/compiler/load-config';

describe('generated services with hooks', () => {
  it('emits explicit hook resolution and await calls inside the service method', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/load-config-hooks');
    const generatedOutputDir = path.join(fixtureDir, 'src', 'generated');
    const previousCwd = process.cwd();

    await fs.rm(generatedOutputDir, { recursive: true, force: true });
    process.chdir(fixtureDir);

    try {
      const config = await loadApiKitConfig();
      await generateProject(config);

      const serviceSource = await fs.readFile(path.join(generatedOutputDir, 'api', 'users', 'users.service.ts'), 'utf8');

      expect(serviceSource).toContain("const measureExecution = resolveResourceHook(__apiKitConfigHooksSource.before?.[0]);");
      expect(serviceSource).toContain("const attachAuditStamp = resolveResourceHook(__apiKitConfigHooksSource.create?.before?.[0]);");
      expect(serviceSource).toContain("const normalizeUserInput = resolveResourceHook(__apiKitResourceHooksSource.create?.before?.[0]);");
      expect(serviceSource).toContain("const publishCreatedEvent = resolveResourceHook(__apiKitResourceHooksSource.create?.after?.[0]);");
      expect(serviceSource).toContain('// Attach audit metadata to the validated create input.');
      expect(serviceSource).toContain('// Normalize the create payload before persisting it.');
      expect(serviceSource).toContain('await measureExecution(context);');
      expect(serviceSource).toContain('await attachAuditStamp(context);');
      expect(serviceSource).toContain('await normalizeUserInput(context);');
      expect(serviceSource).toContain('await publishCreatedEvent(context);');
      expect(serviceSource).toContain('context.result = rows[0] as UserResponseDto;');
    } finally {
      process.chdir(previousCwd);
      await fs.rm(generatedOutputDir, { recursive: true, force: true });
    }
  }, 20000);
});
