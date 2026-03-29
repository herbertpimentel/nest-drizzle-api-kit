#!/usr/bin/env node
import { checkCommand, cleanCommand, generateCommand } from './commands';
import { initCommand } from './init';
import { scanCommand } from './scan';
import { watchCommand } from './watch';

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const [command = 'generate', configPath] = args;

  switch (command) {
    case 'generate':
      await generateCommand(configPath);
      break;
    case 'watch':
      await watchCommand(configPath);
      break;
    case 'check':
      await checkCommand(configPath);
      break;
    case 'init':
      await initCommand(configPath);
      break;
    case 'scan':
      await scanCommand(configPath);
      break;
    case 'clean':
      await cleanCommand(configPath);
      break;
    default:
      throw new Error(`Unknown command "${command}".`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
