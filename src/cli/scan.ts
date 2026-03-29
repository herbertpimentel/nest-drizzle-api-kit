import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import fg from 'fast-glob';
import inquirer from 'inquirer';
import { loadApiKitConfig } from '../compiler/load-config';
import { kebabCase, pascalCase, singularize } from '../compiler/naming';
import { ensureConfigFileExists } from './config-file';

type DiscoveredTable = {
  sourceFile: string;
  sourceFileRelative: string;
  tableExportName: string;
  tableDbName: string;
  resourceName: string;
  resourceConstName: string;
  resourceFileRelative: string;
};

const TABLE_BUILDERS = new Set([
  'pgTable',
  'pgTableCreator',
  'mysqlTable',
  'mysqlTableCreator',
  'sqliteTable',
  'sqliteTableCreator',
  'singlestoreTable',
  'singlestoreTableCreator',
]);

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

function ensureDotSlash(value: string): string {
  const normalized = toPosixPath(value);
  return normalized.startsWith('.') ? normalized : `./${normalized}`;
}

function stripExtension(value: string): string {
  return value.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}

function camelCase(input: string): string {
  const pascal = pascalCase(input);
  return pascal.length > 0 ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : input;
}

function getCallName(expression: ts.Expression): string | null {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }

  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }

  return null;
}

function getStringLiteralValue(expression: ts.Expression | undefined): string | null {
  if (!expression) {
    return null;
  }

  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  return null;
}

function inferResourceDirectory(outputPath: string, existingResourceFiles: string[]): string {
  if (existingResourceFiles.length > 0) {
    const counts = new Map<string, number>();
    for (const file of existingResourceFiles) {
      const dir = path.dirname(file);
      counts.set(dir, (counts.get(dir) ?? 0) + 1);
    }

    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? './src/resources';
  }

  const normalizedOutput = toPosixPath(outputPath);
  if (normalizedOutput.endsWith('/resources/generated/api')) {
    return normalizedOutput.slice(0, -'/generated/api'.length);
  }

  if (normalizedOutput.endsWith('/generated/api')) {
    const base = normalizedOutput.slice(0, -'/generated/api'.length);
    if (base === './src' || base === 'src') {
      return './src/resources';
    }
  }

  return './src/resources';
}

function inferResourceName(tableDbName: string, tableExportName: string): string {
  const dbName = tableDbName.split('.').pop() ?? tableDbName;
  const normalized = singularize(dbName.replace(/[_\-\s]+/g, ' '));
  return camelCase(normalized);
}

function inferResourceFileName(tableDbName: string, tableExportName: string): string {
  const dbName = tableDbName.split('.').pop() ?? tableDbName;
  const source = dbName.trim().length > 0 ? dbName : tableExportName;
  return `${kebabCase(source)}.resource.ts`;
}

function buildResourceFileContents(table: DiscoveredTable): string {
  const importPath = stripExtension(ensureDotSlash(path.relative(path.dirname(table.resourceFileRelative), table.sourceFileRelative)));

  return `import { defineResource } from 'nest-drizzle-api-kit';
import { ${table.tableExportName} } from '${importPath}';

export const ${table.resourceConstName} = defineResource({
  name: '${table.resourceName}',
  table: ${table.tableExportName},
});
`;
}

function findResourcesProperty(sourceFile: ts.SourceFile): ts.ArrayLiteralExpression | null {
  let found: ts.ArrayLiteralExpression | null = null;

  const visit = (node: ts.Node): void => {
    if (found) {
      return;
    }

    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'defineApiKitConfig') {
      const [arg] = node.arguments;
      if (arg && ts.isObjectLiteralExpression(arg)) {
        for (const property of arg.properties) {
          if (
            ts.isPropertyAssignment(property)
            && ts.isIdentifier(property.name)
            && property.name.text === 'resources'
            && ts.isArrayLiteralExpression(property.initializer)
          ) {
            found = property.initializer;
            return;
          }
        }
      }
    }

    node.forEachChild(visit);
  };

  visit(sourceFile);
  return found;
}

function renderResourcesArray(sourceText: string, arrayLiteral: ts.ArrayLiteralExpression, resourcePaths: string[]): string {
  const existingEntries = arrayLiteral.elements.map((element) => sourceText.slice(element.getStart(), element.getEnd()));
  const existingStringValues = new Set(
    arrayLiteral.elements
      .filter((element): element is ts.StringLiteralLike => ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element))
      .map((element) => element.text),
  );

  const newEntries = resourcePaths
    .filter((resourcePath) => !existingStringValues.has(resourcePath))
    .map((resourcePath) => `'${resourcePath}'`);

  const allEntries = [...existingEntries, ...newEntries];
  if (allEntries.length === 0) {
    return '[]';
  }

  const propertyLineStart = sourceText.lastIndexOf('\n', arrayLiteral.getStart()) + 1;
  const propertyIndent = sourceText.slice(propertyLineStart, arrayLiteral.getStart()).match(/^\s*/)?.[0] ?? '';
  const entryIndent = `${propertyIndent}  `;

  return `[\n${allEntries.map((entry) => `${entryIndent}${entry},`).join('\n')}\n${propertyIndent}]`;
}

async function updateConfigResources(configPath: string, resourcePaths: string[]): Promise<number> {
  const absoluteConfigPath = path.resolve(process.cwd(), configPath);
  const sourceText = await fs.readFile(absoluteConfigPath, 'utf8');
  const sourceFile = ts.createSourceFile(absoluteConfigPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const resourcesArray = findResourcesProperty(sourceFile);

  if (!resourcesArray) {
    throw new Error(`Could not locate a literal "resources" array in "${configPath}".`);
  }

  const existingStringValues = new Set(
    resourcesArray.elements
      .filter((element): element is ts.StringLiteralLike => ts.isStringLiteral(element) || ts.isNoSubstitutionTemplateLiteral(element))
      .map((element) => element.text),
  );
  const additions = resourcePaths.filter((resourcePath) => !existingStringValues.has(resourcePath));
  if (additions.length === 0) {
    return 0;
  }

  const updatedArray = renderResourcesArray(sourceText, resourcesArray, additions);
  const updatedText = `${sourceText.slice(0, resourcesArray.getStart())}${updatedArray}${sourceText.slice(resourcesArray.getEnd())}`;
  await fs.writeFile(absoluteConfigPath, updatedText, 'utf8');
  return additions.length;
}

function parseTableFile(sourceFilePath: string, resourceDirectory: string): DiscoveredTable[] {
  const sourceText = ts.sys.readFile(sourceFilePath, 'utf8') ?? '';
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const tables: DiscoveredTable[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) {
      continue;
    }

    const isExported = statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) {
      continue;
    }

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer || !ts.isCallExpression(declaration.initializer)) {
        continue;
      }

      const exportName = declaration.name.text;
      const callName = getCallName(declaration.initializer.expression);

      if (!TABLE_BUILDERS.has(callName ?? '')) {
        continue;
      }

      const tableDbName = getStringLiteralValue(declaration.initializer.arguments[0]) ?? exportName;
      const resourceName = inferResourceName(tableDbName, exportName);
      const resourceConstName = `${camelCase(exportName)}Resource`;
      const resourceFileRelative = ensureDotSlash(
        toPosixPath(path.join(resourceDirectory, inferResourceFileName(tableDbName, exportName))),
      );

      tables.push({
        sourceFile: path.resolve(process.cwd(), sourceFilePath),
        sourceFileRelative: ensureDotSlash(toPosixPath(sourceFilePath)),
        tableExportName: exportName,
        tableDbName,
        resourceName,
        resourceConstName,
        resourceFileRelative,
      });
    }
  }

  return tables;
}

export async function discoverDrizzleTables(configPath = 'nest-drizzle-api-kit.config.ts'): Promise<DiscoveredTable[]> {
  const resolvedConfigPath = await ensureConfigFileExists(configPath);
  const config = await loadApiKitConfig(resolvedConfigPath);
  const existingResourceFiles = (
    await fg(['**/*.resource.ts'], {
      cwd: process.cwd(),
      onlyFiles: true,
      ignore: IGNORE_PATTERNS,
    })
  ).map(ensureDotSlash);
  const resourceDirectory = inferResourceDirectory(config.outputPath, existingResourceFiles);

  const candidateFiles = await fg(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'], {
    cwd: process.cwd(),
    onlyFiles: true,
    ignore: [...IGNORE_PATTERNS, '**/*.resource.ts', '**/*.spec.*', '**/*.test.*'],
  });

  const tables = candidateFiles
    .flatMap((file) => parseTableFile(file, resourceDirectory))
    .sort((a, b) => a.tableDbName.localeCompare(b.tableDbName) || a.sourceFileRelative.localeCompare(b.sourceFileRelative));

  return tables;
}

export async function scaffoldScannedResources(configPath: string, selectedTables: DiscoveredTable[]): Promise<{
  createdFiles: string[];
  updatedConfigEntries: number;
}> {
  const createdFiles: string[] = [];

  for (const table of selectedTables) {
    const absoluteResourcePath = path.resolve(process.cwd(), table.resourceFileRelative);
    try {
      await fs.access(absoluteResourcePath);
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code !== 'ENOENT') {
        throw error;
      }

      await fs.mkdir(path.dirname(absoluteResourcePath), { recursive: true });
      await fs.writeFile(absoluteResourcePath, buildResourceFileContents(table), 'utf8');
      createdFiles.push(table.resourceFileRelative);
    }
  }

  const updatedConfigEntries = await updateConfigResources(
    configPath,
    selectedTables.map((table) => table.resourceFileRelative),
  );

  return {
    createdFiles,
    updatedConfigEntries,
  };
}

async function promptTableSelection(tables: DiscoveredTable[]): Promise<DiscoveredTable[]> {
  if (tables.length === 0) {
    return [];
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return [];
  }

  const answer = await inquirer.prompt<{ selectedTables: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedTables',
      message: 'Select Drizzle tables to scaffold resources for',
      choices: tables.map((table) => ({
        name: `${table.tableDbName} (${table.sourceFileRelative})`,
        value: `${table.sourceFileRelative}::${table.tableExportName}`,
      })),
      pageSize: 12,
    },
  ]);

  const selected = new Set(answer.selectedTables);
  return tables.filter((table) => selected.has(`${table.sourceFileRelative}::${table.tableExportName}`));
}

export async function scanCommand(configPath = 'nest-drizzle-api-kit.config.ts'): Promise<void> {
  const resolvedConfigPath = await ensureConfigFileExists(configPath);
  const tables = await discoverDrizzleTables(resolvedConfigPath);
  if (tables.length === 0) {
    process.stdout.write('No Drizzle table exports were found.\n');
    return;
  }

  const selectedTables = await promptTableSelection(tables);
  if (selectedTables.length === 0) {
    process.stdout.write('No tables selected. Nothing changed.\n');
    return;
  }

  const result = await scaffoldScannedResources(resolvedConfigPath, selectedTables);
  process.stdout.write(
    `Scaffolded ${result.createdFiles.length} resource file(s) and added ${result.updatedConfigEntries} resource entry(ies) to ${resolvedConfigPath}\n`,
  );
}
