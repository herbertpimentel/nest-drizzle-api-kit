import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { ensureDir, writeJsonFile } from './file-utils';

function packageRoot(): string {
  return path.resolve(__dirname, '..', '..');
}

function resolveHygenBin(): string {
  return require.resolve('hygen/dist/bin.js', {
    paths: [packageRoot()],
  });
}

async function createContextFile(data: unknown): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'nest-drizzle-api-kit-'));
  const filePath = path.join(dir, 'context.json');
  await writeJsonFile(filePath, data);
  return filePath;
}

export type RunHygenOptions = {
  generator: string;
  action: string;
  context: unknown;
};

export async function runHygen(options: RunHygenOptions): Promise<void> {
  const contextFile = await createContextFile(options.context);
  const templatesDir = path.join(packageRoot(), '_templates');
  const contextJson = JSON.stringify(options.context);
  const targetArgs =
    typeof options.context === 'object' &&
    options.context !== null &&
    'targets' in options.context &&
    typeof options.context.targets === 'object' &&
    options.context.targets !== null
      ? Object.entries(options.context.targets).flatMap(([key, value]) => [`--${key}`, String(value)])
      : [];
  await ensureDir(templatesDir);

  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [resolveHygenBin(), options.generator, options.action, '--contextFile', contextFile, '--contextJson', contextJson, ...targetArgs],
      {
        cwd: packageRoot(),
        env: {
          ...process.env,
          HYGEN_TMPLS: templatesDir,
        },
        stdio: 'inherit',
      },
    );

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Hygen exited with code ${code ?? 'unknown'}.`));
    });
  });
}
