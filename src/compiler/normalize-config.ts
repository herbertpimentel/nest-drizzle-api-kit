import { createJiti } from 'jiti';
import type {
  ApiKitConfig,
  ResourceDefinition,
  ResourceEndpointName,
  ResourceHookEntry,
  ResourceHooksDefinition,
  ResourceHooksSourceDefinition,
} from '../definition/types';
import type {
  NormalizedApiKitConfig,
  NormalizedEndpointDefinition,
  NormalizedHookCallDefinition,
  NormalizedHooksDefinition,
  NormalizedResourceDefinition,
} from './models';
import { buildCreateDtoFields, buildIdParamField, buildResponseDtoFields } from './dto-fields';
import { kebabCase, pascalCase, pluralize, singularize } from './naming';
import {
  resolveConfigHooksSource,
  resolveDbSchemaType,
  resolveResourceHooksSource,
  resolveResourceSource,
  resolveResourceValidationSchemaSource,
  resolveValidationEngineSource,
  type ResolvedHooksSource,
} from './resource-source';
import { validateApiKitConfig } from './validate-config';

const endpointNames: ResourceEndpointName[] = ['find', 'findOne', 'create', 'update', 'delete'];
const jiti = createJiti(__filename, {
  fsCache: false,
  interopDefault: false,
  moduleCache: false,
});

function operationIdFor(endpoint: ResourceEndpointName, singular: string, plural: string): string {
  const singularPascal = pascalCase(singular);
  const pluralPascal = pascalCase(plural);

  switch (endpoint) {
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

function methodFor(endpoint: ResourceEndpointName): NormalizedEndpointDefinition['method'] {
  switch (endpoint) {
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

function pathFor(endpoint: ResourceEndpointName): string {
  switch (endpoint) {
    case 'find':
    case 'create':
      return '';
    case 'findOne':
    case 'update':
    case 'delete':
      return ':id';
  }
}

function isMutableEndpoint(endpoint: ResourceEndpointName): endpoint is 'create' | 'update' | 'delete' {
  return endpoint === 'create' || endpoint === 'update' || endpoint === 'delete';
}

function isHookMetadataEntry(entry: ResourceHookEntry): entry is Extract<ResourceHookEntry, { use: (...args: never[]) => unknown }> {
  return typeof entry === 'object' && entry !== null && 'use' in entry;
}

function toCamelCase(input: string): string {
  const pascal = pascalCase(input);
  return pascal ? `${pascal.charAt(0).toLowerCase()}${pascal.slice(1)}` : 'hook';
}

function buildHookFallbackName(pathSegments: string[], index: number): string {
  const readableSegments = pathSegments.map((segment) => segment.replace(/[^\w]+/g, ' ')).filter(Boolean).join(' ');
  return toCamelCase(`${readableSegments} hook ${index + 1}`);
}

function suggestHookName(entry: ResourceHookEntry, pathSegments: string[], index: number): string {
  if (isHookMetadataEntry(entry) && typeof entry.name === 'string' && entry.name.trim().length > 0) {
    return toCamelCase(entry.name);
  }

  const hook = typeof entry === 'function' ? entry : entry.use;
  if (typeof hook.name === 'string' && hook.name.trim().length > 0) {
    return toCamelCase(hook.name);
  }

  return buildHookFallbackName(pathSegments, index);
}

function toHookAccessor(pathSegments: string[]): string {
  return pathSegments
    .map((segment, index) => (/^\d+$/.test(segment) ? `?.[${segment}]` : index === 0 ? `.${segment}` : `?.${segment}`))
    .join('');
}

function loadHooksDefinition(source: ResourceHooksSourceDefinition, sourceInfo: ResolvedHooksSource, ownerLabel: string): ResourceHooksDefinition {
  if (typeof source !== 'string') {
    return source;
  }

  const mod = jiti(sourceInfo.sourceFile) as Record<string, unknown>;
  const hooks = (mod.default ?? mod) as unknown;
  if (!hooks || typeof hooks !== 'object') {
    throw new Error(`${ownerLabel} hooks module "${sourceInfo.sourceFile}" must export a hooks definition object as its default export.`);
  }

  return hooks as ResourceHooksDefinition;
}

function normalizeHookEntries(entries: ResourceHookEntry[] | undefined, pathSegments: string[]): NormalizedHookCallDefinition[] {
  if (!entries?.length) {
    return [];
  }

  return entries.map((entry, index) => ({
    accessor: toHookAccessor([...pathSegments, String(index)]),
    suggestedName: suggestHookName(entry, pathSegments, index),
    ...(isHookMetadataEntry(entry) && entry.description ? { description: entry.description } : {}),
  }));
}

function normalizeHooks(hooks: ResourceHooksDefinition, source: ResolvedHooksSource): NormalizedHooksDefinition {
  return {
    source,
    before: normalizeHookEntries(hooks.before, ['before']),
    after: normalizeHookEntries(hooks.after, ['after']),
    endpoints: Object.fromEntries(
      endpointNames.map((endpointName) => [
        endpointName,
        {
          before: normalizeHookEntries(hooks[endpointName]?.before, [endpointName, 'before']),
          after: normalizeHookEntries(hooks[endpointName]?.after, [endpointName, 'after']),
        },
      ]),
    ) as NormalizedHooksDefinition['endpoints'],
  };
}

function normalizeResource(resource: ResourceDefinition): NormalizedResourceDefinition {
  const source = resolveResourceSource(resource);
  const hooksSource = resolveResourceHooksSource(resource);
  const hooks = resource.hooks && hooksSource
    ? normalizeHooks(loadHooksDefinition(resource.hooks, hooksSource, `Resource "${resource.name}"`), hooksSource)
    : undefined;
  const pagination = resource.query?.pagination;
  const paginationOptions = typeof pagination === 'object' && pagination !== null ? pagination : undefined;
  const singularName = singularize(resource.name);
  const pluralName = pluralize(singularName);
  const routeBasePath = resource.route?.basePath ?? kebabCase(pluralName);
  const singularClass = pascalCase(singularName);
  const pluralClass = pascalCase(pluralName);

  const endpoints = Object.fromEntries(
    endpointNames.map((endpointName) => {
      const rawValue = resource.endpoints ? (resource.endpoints as Partial<Record<ResourceEndpointName, unknown>>)[endpointName] : undefined;
      const raw = typeof rawValue === 'object' && rawValue !== null ? rawValue as { enabled?: boolean; transactional?: boolean } : undefined;
      const enabled = rawValue === false ? false : raw?.enabled ?? true;
      const normalized: NormalizedEndpointDefinition = {
        name: endpointName,
        enabled,
        transactional: raw && isMutableEndpoint(endpointName) ? raw.transactional ?? false : false,
        operationId: operationIdFor(endpointName, singularName, pluralName),
        method: methodFor(endpointName),
        path: pathFor(endpointName),
      };
      return [endpointName, normalized];
    }),
  ) as Record<ResourceEndpointName, NormalizedEndpointDefinition>;

  return {
    original: resource,
    name: resource.name,
    singularName,
    pluralName,
    routeBasePath,
    openApiTag: resource.openApi?.tag ?? pluralClass,
    classNames: {
      controller: `${pluralClass}Controller`,
      service: `${pluralClass}Service`,
      module: `${pluralClass}Module`,
      query: `${pluralClass}Query`,
      responseDto: `${singularClass}ResponseDto`,
      createDto: `Create${singularClass}Dto`,
      updateDto: `Update${singularClass}Dto`,
      findQueryDto: `Find${pluralClass}QueryDto`,
      idParamsDto: `${singularClass}IdParamsDto`,
      resourceMetadata: `${pluralClass}ResourceMetadata`,
    },
    fileNames: {
      controller: `${kebabCase(pluralName)}.controller.ts`,
      service: `${kebabCase(pluralName)}.service.ts`,
      module: `${kebabCase(pluralName)}.module.ts`,
      query: `${kebabCase(pluralName)}.query.ts`,
      responseDto: `${kebabCase(singularName)}-response.dto.ts`,
      createDto: `create-${kebabCase(singularName)}.dto.ts`,
      updateDto: `update-${kebabCase(singularName)}.dto.ts`,
      findQueryDto: `find-${kebabCase(pluralName)}-query.dto.ts`,
      idParamsDto: `${kebabCase(singularName)}-id.params.dto.ts`,
      metadata: `${kebabCase(pluralName)}.resource.metadata.ts`,
    },
    endpoints,
    dto: resource.dto ?? {},
    guards: resource.guards ?? {},
    query: {
      ...(resource.query ?? {}),
      pagination: {
        enabled: pagination === false ? false : paginationOptions?.enabled ?? true,
        defaultPage: paginationOptions?.defaultPage ?? 1,
        defaultPageSize: paginationOptions?.defaultPageSize ?? 20,
        maxPageSize: paginationOptions?.maxPageSize ?? 100,
      },
    },
    openApi: {
      enabled: resource.openApi?.enabled ?? true,
      ...resource.openApi,
    },
    ...(resource.validation?.schema
      ? {
          validation: {
            schemaSource: resolveResourceValidationSchemaSource(resource)!,
          },
        }
      : {}),
    ...(hooks
      ? {
          hooks,
        }
      : {}),
    generatedDtos: {
      createFields: buildCreateDtoFields(resource),
      responseFields: buildResponseDtoFields(resource),
      idField: buildIdParamField(resource),
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
  const hasValidationSchemas = resources.some((resource) => Boolean(resource.validation?.schema));
  const validationEngineSource = resolveValidationEngineSource(config);
  const hooksSource = resolveConfigHooksSource(config);
  const hooks = config.hooks && hooksSource
    ? normalizeHooks(loadHooksDefinition(config.hooks, hooksSource, 'Config'), hooksSource)
    : undefined;
  return {
    outputPath: config.outputPath,
    ...(config.dbProviderToken ? { dbProviderToken: config.dbProviderToken } : {}),
    ...(dbSchemaSource ? { dbSchemaSource } : {}),
    ...((validationEngineSource || hasValidationSchemas)
      ? {
          validation: validationEngineSource?.kind === 'custom'
            ? {
                engineName: 'custom',
                engineSource: validationEngineSource,
              }
            : {
                engineName: 'zod',
              },
        }
      : {}),
    ...(hooks
      ? {
          hooks,
        }
      : {}),
    ...(config.postGenerateCommand ? { postGenerateCommand: config.postGenerateCommand } : {}),
    cleanOutput: config.cleanOutput ?? true,
    rootModuleClassName: config.rootModuleClassName ?? 'GeneratedApiModule',
    rootModuleFileName: config.rootModuleFileName ?? 'generated-api.module.ts',
    resources: resources.map(normalizeResource),
  };
}
