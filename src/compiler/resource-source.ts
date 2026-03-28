import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { API_KIT_CONFIG_META_KEY } from '../definition/define-api-kit-config';
import { API_KIT_RESOURCE_META_KEY } from '../definition/define-resource';
import type { ApiKitConfig, ResourceDefinition } from '../definition/types';

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

export type ResolvedResourceSource = {
  sourceFile: string;
  tableAccessExpression: string;
  table: IdentifierImport;
  tableQueryName: string;
};

export type ResolvedConfigSchemaSource = {
  sourceFile: string;
  accessExpression: string;
  importKind: 'default' | 'named' | 'namespace';
  importName: string;
  importSourceName: string;
};

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

export function resolveResourceSource(resource: ResourceDefinition): ResolvedResourceSource {
  const meta = getResourceMeta(resource);
  const sourceFilePath = meta?.sourceFile;
  if (!sourceFilePath) {
    throw new Error(`Resource "${resource.name}" is missing source-file metadata.`);
  }

  const sourceText = fs.readFileSync(sourceFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(sourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const resourceObject = findResourceObjectLiteral(sourceFile, resource.name);
  if (!resourceObject) {
    throw new Error(`Could not locate defineResource(...) call for resource "${resource.name}" in "${sourceFilePath}".`);
  }

  const tableExpression = getProperty(resourceObject, 'table');
  const tableAccessSegments = tableExpression ? getPropertyAccessSegments(tableExpression) : null;
  if (!tableAccessSegments || tableAccessSegments.length === 0) {
    throw new Error(`Resource "${resource.name}" must reference the table with an identifier or property-access expression to generate plain service code.`);
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
    table: tableImport,
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

  const configSourceFilePath = getConfigMeta(config)?.sourceFile;
  if (!configSourceFilePath) {
    throw new Error(
      'dbSchema was provided as an object, but the config source file could not be determined. Use a string module path or load the config from a file.',
    );
  }

  const sourceText = fs.readFileSync(configSourceFilePath, 'utf8');
  const sourceFile = ts.createSourceFile(configSourceFilePath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const configObject = findConfigObjectLiteral(sourceFile);
  if (!configObject) {
    throw new Error(`Could not locate defineApiKitConfig(...) call in "${configSourceFilePath}".`);
  }

  const schemaExpression = getProperty(configObject, 'dbSchema');
  const schemaAccessSegments = schemaExpression ? getPropertyAccessSegments(schemaExpression) : null;
  if (!schemaAccessSegments || schemaAccessSegments.length === 0) {
    throw new Error('dbSchema must reference an imported identifier or property-access expression, or be a string module path.');
  }

  const [schemaRootIdentifier, ...schemaPropertyPath] = schemaAccessSegments;
  if (!schemaRootIdentifier) {
    throw new Error('dbSchema has an invalid reference.');
  }

  const schemaImport = resolveImportedIdentifier(sourceFile, schemaRootIdentifier);
  if (!schemaImport) {
    throw new Error(`Could not resolve import for dbSchema identifier "${schemaRootIdentifier}" in "${configSourceFilePath}".`);
  }

  return {
    sourceFile: path.resolve(path.dirname(configSourceFilePath), schemaImport.sourceFile),
    accessExpression: [schemaImport.localName, ...schemaPropertyPath].join('.'),
    importKind: schemaImport.kind,
    importName: schemaImport.localName,
    importSourceName: schemaImport.importName,
  };
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
