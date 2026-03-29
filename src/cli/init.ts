import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import inquirer from 'inquirer';
import { scanCommand } from './scan';

type InitScaffold = {
  outputPath: string;
  dbProviderToken: string;
  resources: string[];
  dbSchema?: string;
};

const TEXT_FILE_PATTERNS = ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'];
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/coverage/**',
  '**/.git/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.output/**',
  '**/generated/**',
];

function toPosixPath(value: string): string {
  return value.replace(/\\/g, '/');
}

function toConfigPathLiteral(value: string): string {
  const normalized = toPosixPath(value).replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function toResourcePathLiteral(value: string): string {
  const normalized = toPosixPath(value);
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function countBy<T>(values: T[]): Map<T, number> {
  const counts = new Map<T, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
}

function inferOutputPath(resourceFiles: string[]): string {
  const resourceSegments = resourceFiles
    .map((file) => toPosixPath(file).split('/'))
    .map((segments) => {
      const srcIndex = segments.indexOf('src');
      if (srcIndex < 0) {
        return null;
      }

      return {
        prefix: segments.slice(0, srcIndex),
        hasResourcesDir: segments[srcIndex + 1] === 'resources',
      };
    })
    .filter((value): value is { prefix: string[]; hasResourcesDir: boolean } => value !== null);

  if (resourceSegments.length !== resourceFiles.length || resourceSegments.length === 0) {
    return './generated/api';
  }

  const firstPrefix = resourceSegments[0]?.prefix.join('/') ?? '';
  const sharedPrefix = resourceSegments.every((item) => item.prefix.join('/') === firstPrefix);
  if (!sharedPrefix) {
    return './generated/api';
  }

  const baseSegments = firstPrefix.length > 0 ? [...firstPrefix.split('/'), 'src'] : ['src'];
  const allUnderResources = resourceSegments.every((item) => item.hasResourcesDir);
  if (allUnderResources) {
    return `./${[...baseSegments, 'resources', 'generated', 'api'].join('/')}`;
  }

  return `./${[...baseSegments, 'generated', 'api'].join('/')}`;
}

function inferResourceDirectoryFromSourceFiles(sourceFiles: string[]): string {
  const srcPrefixes = sourceFiles
    .map((file) => toPosixPath(file).split('/'))
    .map((segments) => {
      const srcIndex = segments.indexOf('src');
      if (srcIndex < 0) {
        return null;
      }

      return segments.slice(0, srcIndex).join('/');
    })
    .filter((value): value is string => value !== null);

  if (srcPrefixes.length === 0) {
    return './src/resources';
  }

  const counts = countBy(srcPrefixes);
  const bestPrefix = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '';
  return bestPrefix.length > 0 ? `./${bestPrefix}/src/resources` : './src/resources';
}

function inferDbProviderToken(fileContents: string[]): string {
  const tokens: string[] = [];
  const regexes = [
    /provide\s*:\s*['"`]([^'"`]+)['"`]/g,
    /@Inject\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    /export\s+const\s+[A-Z0-9_]+\s*=\s*['"`]([^'"`]+)['"`]/g,
  ];

  for (const content of fileContents) {
    for (const regex of regexes) {
      for (const match of content.matchAll(regex)) {
        if (match[1]) {
          tokens.push(match[1]);
        }
      }
    }
  }

  const dbLikeTokens = tokens.filter((token) => /(database|drizzle|\bdb\b|connection)/i.test(token));
  const counts = countBy(dbLikeTokens.length > 0 ? dbLikeTokens : tokens);
  const preferred = ['DATABASE', 'DRIZZLE_DB', 'database_connection', 'DATABASE_CONNECTION', 'DB'];

  for (const candidate of preferred) {
    if (counts.has(candidate)) {
      return candidate;
    }
  }

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'DATABASE';
}

function inferDbSchemaPath(files: Array<{ path: string; content: string }>): string | undefined {
  const matches = files.filter((file) => /\bexport\s+(const|declare const)\s+schema\b|\bexport\s*\{\s*schema\b/.test(file.content));
  if (matches.length === 0) {
    return undefined;
  }

  const scored = matches
    .map((file) => {
      const normalized = toPosixPath(file.path);
      let score = 0;
      if (/\/src\/db\/db\.(ts|js|mts|cts)$/.test(normalized) || /^src\/db\/db\.(ts|js|mts|cts)$/.test(normalized)) score += 5;
      if (/\/src\/db\.(ts|js|mts|cts)$/.test(normalized) || /^src\/db\.(ts|js|mts|cts)$/.test(normalized)) score += 4;
      if (normalized.includes('/src/db/') || normalized.startsWith('src/db/')) score += 3;
      if (/schema/i.test(normalized)) score += 1;
      return { file, score };
    })
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

  const fallbackMatch = matches[0];
  if (!fallbackMatch) {
    return undefined;
  }
  const bestMatch = scored[0];
  return toConfigPathLiteral(bestMatch ? bestMatch.file.path : fallbackMatch.path);
}

async function discoverInitScaffold(): Promise<InitScaffold> {
  const resourceFiles = (
    await fg(['**/*.resource.ts'], {
      cwd: process.cwd(),
      onlyFiles: true,
      ignore: IGNORE_PATTERNS,
    })
  )
    .map(toPosixPath)
    .sort();

  const sourceFiles = await fg(TEXT_FILE_PATTERNS, {
    cwd: process.cwd(),
    onlyFiles: true,
    ignore: IGNORE_PATTERNS,
  });

  const files = await Promise.all(
    sourceFiles.map(async (file) => ({
      path: toPosixPath(file),
      content: await fs.readFile(path.resolve(process.cwd(), file), 'utf8'),
    })),
  );
  const dbSchema = inferDbSchemaPath(files);
  const resourceDirectory = resourceFiles.length > 0
    ? inferOutputPath(resourceFiles).replace(/\/generated\/api$/, '')
    : inferResourceDirectoryFromSourceFiles(sourceFiles.map(toPosixPath));

  return {
    outputPath: `${resourceDirectory}/generated/api`,
    dbProviderToken: inferDbProviderToken(files.map((file) => file.content)),
    resources: resourceFiles.map(toResourcePathLiteral),
    ...(dbSchema ? { dbSchema } : {}),
  };
}

async function promptResourceDirectory(defaultResourceDirectory: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return defaultResourceDirectory;
  }

  const answer = await inquirer.prompt<{ resourceDirectory: string }>([
    {
      type: 'input',
      name: 'resourceDirectory',
      message: 'Resource directory for generated resource files',
      default: defaultResourceDirectory,
      filter: (value: string) => ensureResourceDirectory(value),
    },
  ]);

  return answer.resourceDirectory;
}

function ensureResourceDirectory(value: string): string {
  const normalized = ensureDotRelative(value);
  return normalized.endsWith('/resources') ? normalized : normalized.replace(/\/+$/, '');
}

function ensureDotRelative(value: string): string {
  const normalized = toPosixPath(value);
  return normalized.startsWith('.') ? normalized : `./${normalized.replace(/^\/+/, '')}`;
}

function renderConfigFile(scaffold: InitScaffold): string {
  const resourceEntries = scaffold.resources.map((resource) => `    '${resource}',`).join('\n');
  return `import { defineApiKitConfig } from 'nest-drizzle-api-kit';

export default defineApiKitConfig({
  outputPath: '${scaffold.outputPath}',
  dbProviderToken: '${scaffold.dbProviderToken}',
${scaffold.dbSchema ? `  dbSchema: '${scaffold.dbSchema}',\n` : ''}  resources: [
${resourceEntries}
  ],
});
`;
}

export async function initCommand(configPath = 'nest-drizzle-api-kit.config.ts'): Promise<void> {
  const absoluteConfigPath = path.resolve(process.cwd(), configPath);

  try {
    await fs.access(absoluteConfigPath);
    throw new Error(`Config file "${configPath}" already exists. Use "nest-drizzle-api-kit scan" to add new resources.`);
  } catch (error: unknown) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== 'ENOENT') {
      throw error;
    }
  }

  const scaffold = await discoverInitScaffold();
  if (scaffold.resources.length === 0) {
    const defaultResourceDirectory = scaffold.outputPath.replace(/\/generated\/api$/, '');
    const selectedResourceDirectory = await promptResourceDirectory(defaultResourceDirectory);
    scaffold.outputPath = `${selectedResourceDirectory}/generated/api`;
  }
  const contents = renderConfigFile(scaffold);
  await fs.mkdir(path.dirname(absoluteConfigPath), { recursive: true });
  await fs.writeFile(absoluteConfigPath, contents, 'utf8');

  process.stdout.write(`Created ${configPath}
Detected ${scaffold.resources.length} resource file(s).
Detected dbProviderToken: ${JSON.stringify(scaffold.dbProviderToken)}
Next:
1. Run "nest-drizzle-api-kit generate"
2. Import "GeneratedApiModule" from the generated output in your app and that is it.
`);

  if (process.stdin.isTTY && process.stdout.isTTY) {
    await scanCommand(configPath);
  }
}
