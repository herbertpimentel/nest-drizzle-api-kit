import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkCommand, cleanCommand, generateCommand } from '../src/cli/commands';
import { scanCommand } from '../src/cli/scan';
import { watchCommand } from '../src/cli/watch';

describe('CLI commands without a config file', () => {
  it('fail gracefully with a clear init hint', async () => {
    const fixtureDir = path.resolve(__dirname, 'fixtures/no-config-project');
    const previousCwd = process.cwd();
    process.chdir(fixtureDir);

    try {
      const expectedMessage =
        'Could not find config file "nest-drizzle-api-kit.config.ts". Run "nest-drizzle-api-kit init" first or pass an explicit config path.';

      await expect(generateCommand()).rejects.toThrow(expectedMessage);
      await expect(checkCommand()).rejects.toThrow(expectedMessage);
      await expect(cleanCommand()).rejects.toThrow(expectedMessage);
      await expect(scanCommand()).rejects.toThrow(expectedMessage);
      await expect(watchCommand()).rejects.toThrow(expectedMessage);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
