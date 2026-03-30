import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { API_KIT_CONFIG_META_KEY } from '../definition/define-api-kit-config';
import { API_KIT_RESOURCE_META_KEY } from '../definition/define-resource';
import type { ApiKitConfig, ResourceDefinition } from '../definition/types';
import type { ImportedValueSource } from './models';

type ResourceInternalMeta = {
  sourceFile?: string;
};

type ConfigInternalMeta = {
  sourceFile?: string;
};

type IdentifierImport = {
  kind: 'default' | 'named' | 'namespace';
  importName: string;
  localName: string;
  sourceFile: string;
};

export type ResolvedImportedValueSource = ImportedValueSource;

export type ResolvedResourceSource = {
  sourceFile: string;
  tableAccessExpression: string;
  table: IdentifierImport;
  tableQueryName: string;
};

export type ResolvedConfigSchemaSource = ResolvedImportedValueSource;
export type ResolvedValidationEngineSource = ResolvedImportedValueSource;

function visitNodes(node: ts.Node, cb: (node: ts.Node) => void): void {
  cb(node);
  node.forEachChild((child) => visitNodes(child, cb));
}

function getResourceMeta(resource: ResourceDefinition): ResourceInternalMeta | undefined {
  return (resource as ResourceDefinition & { [API_KIT_RESOURCE_META_KEY]?: ResourceInternalMeta })[API_KIT_RESOURCE_META_KEY];
}

function getConfigMeta(config: ApiKitConfig): ConfigInternalMeta | undefined {
  return (config as ApiKitConfig & { [API_KIT_CONFIG_META_KEY]?: ConfigInternalMeta })[API_KIT_CONFIG_META_KEY];
}

function resolveImportedIdentifier(sourceFile: ts.SourceFile, identifier: string): IdentifierImport | null {
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) {
      continue;
    }

    const modulePath = statement.moduleSpecifier.text;
    const clause = statement.importClause;
    if (clause.name?.text === identifier) {
      return {
        kind: 'default',
        importName: 'default',
        localName: clause.name.text,
        sourceFile: modulePath,
      };
    }

    const bindings = clause.namedBindings;
    if (bindings) {
      if (ts.isNamespaceImport(bindings) && bindings.name.text === identifier) {
        return {
          kind: 'namespace',
          importName: bindings.name.text,
          localName: bindings.name.text,
          sourceFile: modulePath,
        };
      }

      if (ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (element.name.text === identifier) {
            return {
              kind: 'named',
              importName: element.propertyName?.text ?? element.name.text,
              localName: element.name.text,
              sourceFile: modulePath,
            };
          }
        }
      }
    }
  }

  return null;
}

function findResourceObjectLiteral(sourceFile: ts.SourceFile, resourceName: string): ts.ObjectLiteralExpression | null {
  let match: ts.ObjectLiteralExpression | null = null;

  visitNodes(sourceFile, (node) => {
    if (match || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineResource') {
      return;
    }

    const [arg] = node.arguments;
    if (!arg || !ts.isObjectLiteralExpression(arg)) {
      return;
    }

    const nameProperty = arg.properties.find(
      (property): property is ts.PropertyAssignment =>
        ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'name',
    );

    if (!nameProperty || !ts.isStringLiteral(nameProperty.initializer)) {
      return;
    }

    if (nameProperty.initializer.text === resourceName) {
      match = arg;
    }
  });

  return match;
}

function findConfigObjectLiteral(sourceFile: ts.SourceFile): ts.ObjectLiteralExpression | null {
  let match: ts.ObjectLiteralExpression | null = null;

  visitNodes(sourceFile, (node) => {
    if (match || !ts.isCallExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'defineApiKitConfig') {
      return;
    }

    const [arg] = node.arguments;
    if (!arg || !ts.isObjectLiteralExpression(arg)) {
      return;
    }

    match = arg;
  });

  return match;
}

function getProperty(objectLiteral: ts.ObjectLiteralExpression, propertyName: string): ts.Expression | null {
  const property = objectLiteral.properties.find(
    (entry): entry is ts.PropertyAssignment =>
      ts.isPropertyAssignment(entry) && ts.isIdentifier(entry.name) && entry.name.text === propertyName,
  );

  if (!property) {
    return null;
  }

  return property.initializer;
}

function getNestedProperty(objectLiteral: ts.ObjectLiteralExpression, propertyPath: string[]): ts.Expression | null {
  let current: ts.Expression = objectLiteral;

  for (const segment of propertyPath) {
    if (!ts.isObjectLiteralExpression(current)) {
      return null;
    }

    const next = getProperty(current, segment);
    if (!next) {
      return null;
    }

    current = next;
  }

  return current;
}

function getPropertyAccessSegments(expression: ts.Expression): string[] | null {
  if (
    ts.isAsExpression(expression)
    || ts.isTypeAssertionExpression(expression)
    || ts.isParenthesizedExpression(expression)
    || ts.isNonNullExpression(expression)
  ) {
    return getPropertyAccessSegments(expression.expression);
  }

  if (ts.isIdentifier(expression)) {
    return [expression.text];
  }

  if (ts.isPropertyAccessExpression(expression)) {
    const segments = getPropertyAccessSegments(expression.expression);
    if (!segments) {
      return null;
    }

    return [...segments, expression.name.text];
  }

  return null;
}

function toResolvedImportedValueSource(baseDir: string, imported: IdentifierImport, propertyPath: string[]): ResolvedImportedValueSource {
  return {
    sourceFile: path.resolve(baseDir, imported.sourceFile),
    accessExpression: [imported.localName, ...propertyPath].join('.'),
    importKind: imported.kind,
    importName: imported.localName,
    importSourceName: imported.importName,
  };
}

function loadResourceAst(resource: ResourceDefinition): {
  sourceFilePath: string;
  sourceFile: ts.SourceFile;
  resourceObject: ts.ObjectLiteralExpression;
} {
  const sourceFilePath = getResourceMeta(resource)?.sourceFile;
  if (!sourceFilePath) {
    throw new Error(`Resource "${resource.name}" is missing source-file metadata.`);
  }

  const sourceText = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const resourceObject = findResourceObjectLiteral(sourceFile, resource.name);
  if (!resourceObject) {
    throw new Error(`Could not locate defineResource(...) call for resource "${resource.name}" in "${sourceFilePath}".`);
  }

  return { sourceFilePath, sourceFile, resourceObject };
}

function loadConfigAst(config: ApiKitConfig): {
  sourceFilePath: string;
  sourceFile: ts.SourceFile;
  configObject: ts.ObjectLiteralExpression;
} {
  const sourceFilePath = getConfigMeta(config)?.sourceFile;
  if (!sourceFilePath) {
    throw new Error('The config is missing source-file metadata.');
  }

  const sourceText = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const configObject = findConfigObjectLiteral(sourceFile);
  if (!configObject) {
    throw new Error(`Could not locate defineApiKitConfig(...) call in "${sourceFilePath}".`);
  }

  return { sourceFilePath, sourceFile, configObject };
}

function resolveImportedExpressionSource(
  sourceFilePath: string,
  sourceFile: ts.SourceFile,
  expression: ts.Expression | null,
  errorLabel: string,
): ResolvedImportedValueSource | null {
  if (!expression) {
    return null;
  }

  const accessSegments = getPropertyAccessSegments(expression);
  if (!accessSegments || accessSegments.length === 0) {
    throw new Error(`${errorLabel} must reference an imported identifier or property-access expression.`);
  }

  const [rootIdentifier, ...propertyPath] = accessSegments;
  if (!rootIdentifier) {
    throw new Error(`${errorLabel} has an invalid reference.`);
  }

  const imported = resolveImportedIdentifier(sourceFile, rootIdentifier);
  if (!imported) {
    throw new Error(`Could not resolve import for ${errorLabel} identifier "${rootIdentifier}" in "${sourceFilePath}".`);
  }

  return toResolvedImportedValueSource(path.dirname(sourceFilePath), imported, propertyPath);
}

export function resolveResourceFilePath(resource: ResourceDefinition): string {
  const sourceFilePath = getResourceMeta(resource)?.sourceFile;
  if (!sourceFilePath) {
    throw new Error(`Resource "${resource.name}" is missing source-file metadata.`);
  }

  return sourceFilePath;
}

export function resolveConfigFilePath(config: ApiKitConfig): string {
  const sourceFilePath = getConfigMeta(config)?.sourceFile;
  if (!sourceFilePath) {
    throw new Error('The config is missing source-file metadata.');
  }

  return sourceFilePath;
}

export function resolveResourceImportedValueSource(
  resource: ResourceDefinition,
  propertyPath: string[],
  errorLabel: string,
): ResolvedImportedValueSource | null {
  const { sourceFilePath, sourceFile, resourceObject } = loadResourceAst(resource);
  const expression = getNestedProperty(resourceObject, propertyPath);
  return resolveImportedExpressionSource(sourceFilePath, sourceFile, expression, errorLabel);
}

export function resolveResourceImportedValueSources(
  resource: ResourceDefinition,
  propertyPath: string[],
  errorLabel: string,
): ResolvedImportedValueSource[] {
  const { sourceFilePath, sourceFile, resourceObject } = loadResourceAst(resource);
  const expression = getNestedProperty(resourceObject, propertyPath);
  if (!expression) {
    return [];
  }

  if (!ts.isArrayLiteralExpression(expression)) {
    throw new Error(`${errorLabel} must be an array of imported identifiers or property-access expressions.`);
  }

  return expression.elements.map((element, index) => resolveImportedExpressionSource(
    sourceFilePath,
    sourceFile,
    element,
    `${errorLabel}[${index}]`,
  )!).filter(Boolean);
}

export function resolveResourceSource(resource: ResourceDefinition): ResolvedResourceSource {
  const { sourceFilePath, sourceFile, resourceObject } = loadResourceAst(resource);
  const tableExpression = getProperty(resourceObject, 'table');
  const tableAccessSegments = tableExpression ? getPropertyAccessSegments(tableExpression) : null;
  if (!tableAccessSegments || tableAccessSegments.length === 0) {
    throw new Error(`Resource "${resource.name}" must define a table reference.`);
  }
  const [tableRootIdentifier, ...tablePropertyPath] = tableAccessSegments;
  if (!tableRootIdentifier) {
    throw new Error(`Resource "${resource.name}" has an invalid table reference.`);
  }
  const tableImport = resolveImportedIdentifier(sourceFile, tableRootIdentifier);
  if (!tableImport) {
    throw new Error(`Could not resolve import for table identifier "${tableRootIdentifier}" in "${sourceFilePath}".`);
  }
  const tableAccessExpression = [tableImport.localName, ...tablePropertyPath].join('.');
  const tableQueryName = tablePropertyPath.at(-1) ?? tableImport.importName;

  return {
    sourceFile: sourceFilePath,
    tableAccessExpression,
    table: {
      kind: tableImport.kind,
      importName: tableImport.importName,
      localName: tableImport.localName,
      sourceFile: tableImport.sourceFile,
    },
    tableQueryName,
  };
}

export function resolveDbSchemaType(config: ApiKitConfig): ResolvedConfigSchemaSource | null {
  if (!config.dbSchema) {
    return null;
  }

  if (typeof config.dbSchema === 'string') {
    const configSourceFile = getConfigMeta(config)?.sourceFile;
    const baseDir = configSourceFile ? path.dirname(configSourceFile) : process.cwd();
    return {
      sourceFile: path.resolve(baseDir, config.dbSchema),
      accessExpression: 'schema',
      importKind: 'named',
      importName: 'schema',
      importSourceName: 'schema',
    };
  }

  const { sourceFilePath, sourceFile, configObject } = loadConfigAst(config);
  const schemaExpression = getProperty(configObject, 'dbSchema');
  return resolveImportedExpressionSource(sourceFilePath, sourceFile, schemaExpression, 'dbSchema');
}

export function resolveValidationEngineSource(config: ApiKitConfig): ResolvedValidationEngineSource | null {
  const engine = config.validation?.engine;
  if (!engine || engine === 'zod') {
    return null;
  }

  const configSourceFilePath = getConfigMeta(config)?.sourceFile;
  if (typeof engine === 'string') {
    const baseDir = configSourceFilePath ? path.dirname(configSourceFilePath) : process.cwd();
    return {
      sourceFile: path.resolve(baseDir, engine),
      accessExpression: '__apiKitValidationEngine',
      importKind: 'default',
      importName: '__apiKitValidationEngine',
      importSourceName: 'default',
    };
  }

  const { sourceFilePath, sourceFile, configObject } = loadConfigAst(config);
  const engineExpression = getNestedProperty(configObject, ['validation', 'engine']);
  return resolveImportedExpressionSource(sourceFilePath, sourceFile, engineExpression, 'validation.engine');
}

export function resolveDbProviderToken(config: {
  dbProviderToken?: string;
}): string {
  const token = config.dbProviderToken?.trim();
  if (!token) {
    throw new Error(
      'Generated services require "dbProviderToken" in the config. Your target NestJS project must register a provider with that exact token.',
    );
  }

  return token;
}
