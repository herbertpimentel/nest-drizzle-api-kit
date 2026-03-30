import path from 'node:path';
import type {
  ApiKitConfig,
  BodyInputDefinition,
  OutputDefinition,
  ResourceDefinition,
  ResourceFunctionCommonDefinition,
  ResourceFunctionHooksDefinition,
  ResourceFunctionName,
  ResourceHookReference,
} from '../definition/types';
import type {
  ImportedValueSource,
  NormalizedApiKitConfig,
  NormalizedApiKitHooksDefinition,
  NormalizedDtoDefinition,
  NormalizedHookDefinition,
  NormalizedHookPhaseDefinition,
  NormalizedResourceDefinition,
  NormalizedResourceFunctionDefinition,
} from './models';
import {
  buildGeneratedBodyInputFields,
  buildGeneratedOutputFields,
  buildGeneratedParamsInputFields,
  buildPrimaryIdField,
} from './dto-fields';
import { kebabCase, pascalCase, pluralize, singularize } from './naming';
import {
  resolveConfigFilePath,
  resolveDbSchemaType,
  resolveResourceFilePath,
  resolveResourceImportedValueSource,
  resolveResourceImportedValueSources,
  resolveResourceSource,
  resolveValidationEngineSource,
} from './resource-source';
import { validateApiKitConfig } from './validate-config';

const functionNames: ResourceFunctionName[] = ['find', 'findOne', 'create', 'update', 'delete'];

function operationIdFor(functionName: ResourceFunctionName, singular: string, plural: string): string {
  const singularPascal = pascalCase(singular);
  const pluralPascal = pascalCase(plural);

  switch (functionName) {
    case 'find':
      return `find${pluralPascal}`;
    case 'findOne':
      return `find${singularPascal}`;
    case 'create':
      return `create${singularPascal}`;
    case 'update':
      return `update${singularPascal}`;
    case 'delete':
      return `delete${singularPascal}`;
  }
}

function methodFor(functionName: ResourceFunctionName): NormalizedResourceFunctionDefinition['method'] {
  switch (functionName) {
    case 'find':
    case 'findOne':
      return 'GET';
    case 'create':
      return 'POST';
    case 'update':
      return 'PATCH';
    case 'delete':
      return 'DELETE';
  }
}

function pathFor(functionName: ResourceFunctionName): string {
  switch (functionName) {
    case 'find':
    case 'create':
      return '';
    case 'findOne':
    case 'update':
    case 'delete':
      return ':id';
  }
}

function defaultSummaryFor(functionName: ResourceFunctionName, singular: string, plural: string): string {
  switch (functionName) {
    case 'find':
      return `Find ${plural}`;
    case 'findOne':
      return `Find ${singular}`;
    case 'create':
      return `Create ${singular}`;
    case 'update':
      return `Update ${singular}`;
    case 'delete':
      return `Delete ${singular}`;
  }
}

function isMutableFunction(functionName: ResourceFunctionName): functionName is 'create' | 'update' | 'delete' {
  return functionName === 'create' || functionName === 'update' || functionName === 'delete';
}

function toCamelCase(input: string): string {
  const pascal = pascalCase(input);
  return pascal.length > 0 ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : 'value';
}

function stripExtension(value: string): string {
  return value.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/i, '');
}

function aliasForStringImport(modulePath: string, fallbackName: string): string {
  const baseName = path.basename(stripExtension(modulePath));
  const candidate = baseName.replace(/[^A-Za-z0-9]+/g, ' ').trim();
  return candidate.length > 0 ? toCamelCase(candidate) : fallbackName;
}

function defaultImportedValueSource(ownerFile: string, modulePath: string, fallbackName: string): ImportedValueSource {
  const importName = aliasForStringImport(modulePath, fallbackName);
  return {
    sourceFile: path.resolve(path.dirname(ownerFile), modulePath),
    accessExpression: importName,
    importKind: 'default',
    importName,
    importSourceName: 'default',
  };
}

function hookNameFromReference(entry: ResourceHookReference, fallbackPath: string): string {
  if (typeof entry === 'object' && entry.name?.trim()) {
    return toCamelCase(entry.name);
  }

  return aliasForStringImport(fallbackPath, 'resourceHook');
}

function normalizeHookReference(entry: ResourceHookReference, ownerFile: string): NormalizedHookDefinition {
  const pathValue = typeof entry === 'string' ? entry : entry.path;
  return {
    sourceFile: path.resolve(path.dirname(ownerFile), pathValue),
    suggestedName: hookNameFromReference(entry, pathValue),
    ...(typeof entry === 'object' && entry.description ? { description: entry.description } : {}),
  };
}

function normalizeHookPhase(
  hooks: ResourceFunctionHooksDefinition | undefined,
  ownerFile: string,
): NormalizedHookPhaseDefinition {
  return {
    before: (hooks?.before ?? []).map((entry) => normalizeHookReference(entry, ownerFile)),
    after: (hooks?.after ?? []).map((entry) => normalizeHookReference(entry, ownerFile)),
  };
}

function normalizeConfigHooks(config: ApiKitConfig): NormalizedApiKitHooksDefinition | undefined {
  if (!config.hooks) {
    return undefined;
  }

  const configFile = resolveConfigFilePath(config);
  return {
    ...normalizeHookPhase(config.hooks, configFile),
    functions: Object.fromEntries(
      functionNames.map((functionName) => [
        functionName,
        normalizeHookPhase(config.hooks?.[functionName], configFile),
      ]),
    ) as Record<ResourceFunctionName, NormalizedHookPhaseDefinition>,
  };
}

function normalizeGeneratedQueryInputDto(
  singularClass: string,
  pluralClass: string,
  singularFile: string,
  pluralFile: string,
): Extract<NormalizedDtoDefinition, { mode: 'generated' }> {
  return {
    mode: 'generated',
    kind: 'query',
    className: `Find${pluralClass}InputDto`,
    fileName: `find-${pluralFile}-input.dto.ts`,
  };
}

function normalizeGeneratedParamsInputDto(
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
): Extract<NormalizedDtoDefinition, { mode: 'generated' }> {
  return {
    mode: 'generated',
    kind: 'params',
    className: `${singularClass}IdParamsDto`,
    fileName: `${singularFile}-id.params.dto.ts`,
    fields: buildGeneratedParamsInputFields(resource),
  };
}

function normalizeGeneratedBodyInputDto(
  functionName: 'create' | 'update',
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
  config: Extract<BodyInputDefinition, { mode?: 'generate' }> | undefined,
): Extract<NormalizedDtoDefinition, { mode: 'generated' }> {
  const prefix = functionName === 'create' ? 'Create' : 'Update';
  return {
    mode: 'generated',
    kind: 'body',
    className: `${prefix}${singularClass}InputDto`,
    fileName: `${functionName}-${singularFile}-input.dto.ts`,
    fields: buildGeneratedBodyInputFields(resource, config),
  };
}

function normalizeGeneratedOutputDto(
  functionName: 'find' | 'findOne' | 'create' | 'update',
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
  pluralClass: string,
  pluralFile: string,
  config: Extract<OutputDefinition, { mode?: 'generate' }> | undefined,
): Extract<NormalizedDtoDefinition, { mode: 'generated' }> {
  const prefix = functionName === 'find'
    ? `Find${pluralClass}`
    : functionName === 'findOne'
      ? `FindOne${singularClass}`
      : functionName === 'create'
        ? `Create${singularClass}`
        : `Update${singularClass}`;
  const filePrefix = functionName === 'find'
    ? `find-${pluralFile}`
    : functionName === 'findOne'
      ? `find-one-${singularFile}`
      : functionName === 'create'
        ? `create-${singularFile}`
        : `update-${singularFile}`;

  return {
    mode: 'generated',
    kind: 'output',
    className: `${prefix}OutputDto`,
    fileName: `${filePrefix}-output.dto.ts`,
    fields: buildGeneratedOutputFields(resource, config),
  };
}

function normalizeCustomDtoDefinition(
  resource: ResourceDefinition,
  propertyPath: string[],
  errorLabel: string,
  kind: 'body' | 'query' | 'params' | 'output',
): Extract<NormalizedDtoDefinition, { mode: 'custom' }> {
  const source = resolveResourceImportedValueSource(resource, propertyPath, errorLabel);
  if (!source) {
    throw new Error(`${errorLabel} must reference an imported class.`);
  }

  return {
    mode: 'custom',
    kind,
    source,
  };
}

function normalizeFindInput(
  resource: ResourceDefinition,
  singularClass: string,
  pluralClass: string,
  singularFile: string,
  pluralFile: string,
): NormalizedDtoDefinition {
  const input = resource.functions?.find?.input;
  if (input?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', 'find', 'input', 'class'],
      `Resource "${resource.name}" function "find" input.class`,
      'query',
    );
  }

  return normalizeGeneratedQueryInputDto(singularClass, pluralClass, singularFile, pluralFile);
}

function normalizeFindOneInput(
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
): NormalizedDtoDefinition {
  const input = resource.functions?.findOne?.input;
  if (input?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', 'findOne', 'input', 'class'],
      `Resource "${resource.name}" function "findOne" input.class`,
      'params',
    );
  }

  return normalizeGeneratedParamsInputDto(resource, singularClass, singularFile);
}

function normalizeCreateInput(
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
): NormalizedDtoDefinition {
  const input = resource.functions?.create?.input;
  if (input?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', 'create', 'input', 'class'],
      `Resource "${resource.name}" function "create" input.class`,
      'body',
    );
  }

  return normalizeGeneratedBodyInputDto('create', resource, singularClass, singularFile, input);
}

function normalizeUpdateInput(
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
): NormalizedDtoDefinition {
  const input = resource.functions?.update?.input;
  if (input?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', 'update', 'input', 'class'],
      `Resource "${resource.name}" function "update" input.class`,
      'body',
    );
  }

  return normalizeGeneratedBodyInputDto('update', resource, singularClass, singularFile, input);
}

function normalizeDeleteInput(
  resource: ResourceDefinition,
  singularClass: string,
  singularFile: string,
): NormalizedDtoDefinition {
  const input = resource.functions?.delete?.input;
  if (input?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', 'delete', 'input', 'class'],
      `Resource "${resource.name}" function "delete" input.class`,
      'params',
    );
  }

  return normalizeGeneratedParamsInputDto(resource, singularClass, singularFile);
}

function normalizeFunctionOutput(
  resource: ResourceDefinition,
  functionName: 'find' | 'findOne' | 'create' | 'update',
  singularClass: string,
  singularFile: string,
  pluralClass: string,
  pluralFile: string,
): NormalizedDtoDefinition {
  const output = resource.functions?.[functionName]?.output;
  if (output?.mode === 'custom') {
    return normalizeCustomDtoDefinition(
      resource,
      ['functions', functionName, 'output', 'class'],
      `Resource "${resource.name}" function "${functionName}" output.class`,
      'output',
    );
  }

  return normalizeGeneratedOutputDto(
    functionName,
    resource,
    singularClass,
    singularFile,
    pluralClass,
    pluralFile,
    output,
  );
}

function normalizeValidation(
  resource: ResourceDefinition,
  functionName: ResourceFunctionName,
): ImportedValueSource | undefined {
  const validation = resource.functions?.[functionName]?.validation;
  if (!validation) {
    return undefined;
  }

  if (typeof validation === 'string') {
    return defaultImportedValueSource(
      resolveResourceFilePath(resource),
      validation,
      `${functionName}ValidationSchema`,
    );
  }

  return resolveResourceImportedValueSource(
    resource,
    ['functions', functionName, 'validation'],
    `Resource "${resource.name}" function "${functionName}" validation`,
  ) ?? undefined;
}

function normalizeFunctionDefinition(
  resource: ResourceDefinition,
  functionName: ResourceFunctionName,
  singularName: string,
  pluralName: string,
  singularClass: string,
  pluralClass: string,
  singularFile: string,
  pluralFile: string,
  resourceFile: string,
): NormalizedResourceFunctionDefinition {
  const raw = resource.functions?.[functionName] as (ResourceFunctionCommonDefinition & { transactional?: boolean }) | undefined;
  const enabled = raw?.enabled ?? true;
  const validation = normalizeValidation(resource, functionName);

  const input = functionName === 'find'
    ? normalizeFindInput(resource, singularClass, pluralClass, singularFile, pluralFile)
    : functionName === 'findOne'
      ? normalizeFindOneInput(resource, singularClass, singularFile)
      : functionName === 'create'
        ? normalizeCreateInput(resource, singularClass, singularFile)
        : functionName === 'update'
          ? normalizeUpdateInput(resource, singularClass, singularFile)
          : normalizeDeleteInput(resource, singularClass, singularFile);

  const output = functionName === 'delete'
    ? undefined
    : normalizeFunctionOutput(resource, functionName, singularClass, singularFile, pluralClass, pluralFile);

  return {
    name: functionName,
    enabled,
    transactional: isMutableFunction(functionName) ? raw?.transactional ?? false : false,
    operationId: operationIdFor(functionName, singularName, pluralName),
    method: methodFor(functionName),
    path: pathFor(functionName),
    summary: raw?.summary ?? defaultSummaryFor(functionName, singularName, pluralName),
    ...(raw?.description ? { description: raw.description } : {}),
    guards: resolveResourceImportedValueSources(
      resource,
      ['functions', functionName, 'guards'],
      `Resource "${resource.name}" function "${functionName}" guards`,
    ),
    input,
    ...(output ? { output } : {}),
    ...(validation ? { validation } : {}),
    hooks: normalizeHookPhase(raw?.hooks, resourceFile),
  };
}

function normalizeResource(resource: ResourceDefinition): NormalizedResourceDefinition {
  const source = resolveResourceSource(resource);
  const resourceFile = resolveResourceFilePath(resource);
  const singularName = singularize(resource.name);
  const pluralName = pluralize(singularName);
  const singularClass = pascalCase(singularName);
  const pluralClass = pascalCase(pluralName);
  const singularFile = kebabCase(singularName);
  const pluralFile = kebabCase(pluralName);
  const pagination = resource.query?.pagination;
  const paginationOptions = typeof pagination === 'object' && pagination !== null ? pagination : undefined;

  return {
    original: resource,
    name: resource.name,
    singularName,
    pluralName,
    basePath: resource.basePath ?? kebabCase(pluralName),
    docs: {
      enabled: resource.docs?.enabled ?? true,
      tags: resource.docs?.tags ?? [pluralClass],
      ...(resource.docs?.description ? { description: resource.docs.description } : {}),
    },
    classNames: {
      controller: `${pluralClass}Controller`,
      service: `${pluralClass}Service`,
      module: `${pluralClass}Module`,
      query: `${pluralClass}Query`,
      resourceMetadata: `${pluralClass}ResourceMetadata`,
    },
    fileNames: {
      controller: `${pluralFile}.controller.ts`,
      service: `${pluralFile}.service.ts`,
      module: `${pluralFile}.module.ts`,
      query: `${pluralFile}.query.ts`,
      metadata: `${pluralFile}.resource.metadata.ts`,
    },
    guards: resolveResourceImportedValueSources(
      resource,
      ['guards'],
      `Resource "${resource.name}" guards`,
    ),
    query: {
      ...(resource.query ?? {}),
      pagination: {
        enabled: pagination === false ? false : paginationOptions?.enabled ?? true,
        defaultPage: paginationOptions?.defaultPage ?? 1,
        defaultPageSize: paginationOptions?.defaultPageSize ?? 20,
        maxPageSize: paginationOptions?.maxPageSize ?? 100,
      },
    },
    functions: Object.fromEntries(
      functionNames.map((functionName) => [
        functionName,
        normalizeFunctionDefinition(
          resource,
          functionName,
          singularName,
          pluralName,
          singularClass,
          pluralClass,
          singularFile,
          pluralFile,
          resourceFile,
        ),
      ]),
    ) as Record<ResourceFunctionName, NormalizedResourceFunctionDefinition>,
    generatedDtos: {
      idField: buildPrimaryIdField(resource),
    },
    source: {
      sourceFile: source.sourceFile,
      tableAccessExpression: source.tableAccessExpression,
      tableImportKind: source.table.kind,
      tableImportName: source.table.localName,
      tableImportSourceName: source.table.importName,
      tableQueryName: source.tableQueryName,
      tableImportSourceFile: source.table.sourceFile,
    },
  };
}

export function normalizeApiKitConfig(config: ApiKitConfig): NormalizedApiKitConfig {
  validateApiKitConfig(config);

  const resources = config.resources.filter((item): item is ResourceDefinition => typeof item !== 'string');
  const dbSchemaSource = resolveDbSchemaType(config);
  const hasValidation = resources.some((resource) => functionNames.some((functionName) => Boolean(resource.functions?.[functionName]?.validation)));
  const validationEngineSource = resolveValidationEngineSource(config);
  const normalizedHooks = normalizeConfigHooks(config);

  return {
    outputPath: config.outputPath,
    ...(config.dbProviderToken ? { dbProviderToken: config.dbProviderToken } : {}),
    ...(dbSchemaSource ? { dbSchemaSource } : {}),
    ...((validationEngineSource || hasValidation)
      ? {
          validation: validationEngineSource
            ? {
                engineSource: validationEngineSource,
              }
            : {},
        }
      : {}),
    ...(normalizedHooks ? { hooks: normalizedHooks } : {}),
    ...(config.postGenerateCommand ? { postGenerateCommand: config.postGenerateCommand } : {}),
    cleanOutput: config.cleanOutput ?? true,
    rootModuleClassName: config.rootModuleClassName ?? 'GeneratedApiModule',
    rootModuleFileName: config.rootModuleFileName ?? 'generated-api.module.ts',
    resources: resources.map((resource) => normalizeResource(resource)),
  };
}
