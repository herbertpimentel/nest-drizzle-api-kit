import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

type EndOfLine = '\n' | '\r\n';

function parseEditorConfigEndOfLine(contents: string): EndOfLine | null {
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith(';')) {
      continue;
    }

    const match = line.match(/^end_of_line\s*=\s*(lf|crlf)$/i);
    if (!match) {
      continue;
    }

    return match[1]?.toLowerCase() === 'crlf' ? '\r\n' : '\n';
  }

  return null;
}

async function detectEditorConfigEndOfLine(startDir: string): Promise<EndOfLine | null> {
  let currentDir = path.resolve(startDir);

  while (true) {
    const editorConfigPath = path.join(currentDir, '.editorconfig');
    try {
      const contents = await fs.readFile(editorConfigPath, 'utf8');
      const resolved = parseEditorConfigEndOfLine(contents);
      if (resolved) {
        return resolved;
      }
    } catch {
      // ignore and continue walking upward
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

async function detectExistingFileEndOfLine(dirPath: string): Promise<EndOfLine | null> {
  const queue: string[] = [dirPath];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    let entries;
    try {
      entries = await fs.readdir(current, { encoding: 'utf8', withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
          continue;
        }
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile() || !/\.(ts|js|json|md|yml|yaml)$/i.test(entry.name)) {
        continue;
      }

      try {
        const contents = await fs.readFile(fullPath, 'utf8');
        if (contents.includes('\r\n')) {
          return '\r\n';
        }
        if (contents.includes('\n')) {
          return '\n';
        }
      } catch {
        // ignore unreadable files
      }
    }
  }

  return null;
}

async function detectPreferredEndOfLine(outputPath: string): Promise<EndOfLine> {
  return (
    await detectEditorConfigEndOfLine(outputPath)
    ?? await detectExistingFileEndOfLine(process.cwd())
    ?? (os.EOL === '\r\n' ? '\r\n' : '\n')
  );
}

async function normalizeFileEndOfLine(filePath: string, eol: EndOfLine): Promise<void> {
  const original = await fs.readFile(filePath, 'utf8');
  const normalized = original.replace(/\r?\n/g, eol);

  if (normalized !== original) {
    await fs.writeFile(filePath, normalized, 'utf8');
  }
}

export async function normalizeGeneratedFiles(outputPath: string): Promise<void> {
  const eol = await detectPreferredEndOfLine(outputPath);
  const queue: string[] = [outputPath];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

    const entries = await fs.readdir(current, { encoding: 'utf8', withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (entry.isFile() && /\.(ts|tsx|js|jsx|mjs|cjs|json|md)$/i.test(entry.name)) {
        await normalizeFileEndOfLine(fullPath, eol);
      }
    }
  }
}

export async function runPostGenerateCommand(command: string, cwd: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: 'inherit',
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`postGenerateCommand exited with code ${code ?? 'unknown'}.`));
    });
  });
}
