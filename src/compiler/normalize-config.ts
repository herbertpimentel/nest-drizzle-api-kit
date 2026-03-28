import type { ApiKitConfig, ResourceDefinition, ResourceEndpointName } from '../definition/types';
import type { NormalizedApiKitConfig, NormalizedEndpointDefinition, NormalizedResourceDefinition } from './models';
import { buildCreateDtoFields, buildIdParamField, buildResponseDtoFields } from './dto-fields';
import { kebabCase, pascalCase, pluralize, singularize } from './naming';
import { resolveDbSchemaType, resolveResourceSource } from './resource-source';
import { validateApiKitConfig } from './validate-config';

const endpointNames: ResourceEndpointName[] = ['find', 'findOne', 'create', 'update', 'delete'];

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

function normalizeResource(resource: ResourceDefinition): NormalizedResourceDefinition {
  const source = resolveResourceSource(resource);
  const pagination = resource.query?.pagination;
  const paginationOptions = typeof pagination === 'object' && pagination !== null ? pagination : undefined;
  const singularName = singularize(resource.name);
  const pluralName = pluralize(singularName);
  const routeBasePath = resource.route?.basePath ?? kebabCase(pluralName);
  const singularClass = pascalCase(singularName);
  const pluralClass = pascalCase(pluralName);

  const endpoints = Object.fromEntries(
    endpointNames.map((endpointName) => {
      const raw = resource.endpoints?.[endpointName];
      const enabled = raw !== false;
      const normalized: NormalizedEndpointDefinition = {
        name: endpointName,
        enabled,
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
  return {
    outputPath: config.outputPath,
    ...(config.dbProviderToken ? { dbProviderToken: config.dbProviderToken } : {}),
    ...(dbSchemaSource ? { dbSchemaSource } : {}),
    ...(config.postGenerateCommand ? { postGenerateCommand: config.postGenerateCommand } : {}),
    cleanOutput: config.cleanOutput ?? true,
    rootModuleClassName: config.rootModuleClassName ?? 'GeneratedApiModule',
    rootModuleFileName: config.rootModuleFileName ?? 'generated-api.module.ts',
    resources: resources.map(normalizeResource),
  };
}
