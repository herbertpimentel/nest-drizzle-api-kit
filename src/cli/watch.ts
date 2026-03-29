import chokidar from 'chokidar';
import { generateCommand } from './commands';
import { ensureConfigFileExists } from './config-file';

export async function watchCommand(configPath?: string): Promise<void> {
  const target = await ensureConfigFileExists(configPath);
  await generateCommand(target);

  const watcher = chokidar.watch([target, 'src/**/*.resource.ts'], {
    ignoreInitial: true,
  });

  watcher.on('all', async () => {
    try {
      await generateCommand(target);
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      process.stderr.write(`${message}\n`);
    }
  });

  process.stdout.write(`Watching ${target} and resource files...\n`);
}
