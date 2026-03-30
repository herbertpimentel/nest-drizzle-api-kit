import type {
  ApiKitConfig,
  ResourceDefinition,
  ResourceEndpointName,
  ResourceQueryDefinition,
  ResourceOpenApiDefinition,
  ResourceGuardsDefinition,
  ResourceDtoDefinition,
} from '../definition/types';
import type { GeneratedDtoField } from './dto-fields';

export type NormalizedHookCallDefinition = {
  accessor: string;
  suggestedName: string;
  description?: string;
};

export type NormalizedHooksDefinition = {
  source: {
    sourceFile: string;
    accessExpression: string;
    importKind: 'default' | 'named' | 'namespace';
    importName: string;
    importSourceName: string;
  };
  before: NormalizedHookCallDefinition[];
  after: NormalizedHookCallDefinition[];
  endpoints: Record<ResourceEndpointName, {
    before: NormalizedHookCallDefinition[];
    after: NormalizedHookCallDefinition[];
  }>;
};

export type NormalizedEndpointDefinition = {
  name: ResourceEndpointName;
  enabled: boolean;
  operationId: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
};

export type NormalizedResourceDefinition = {
  original: ResourceDefinition;
  name: string;
  singularName: string;
  pluralName: string;
  routeBasePath: string;
  openApiTag: string;
  classNames: {
    controller: string;
    service: string;
    module: string;
    query: string;
    responseDto: string;
    createDto: string;
    updateDto: string;
    findQueryDto: string;
    idParamsDto: string;
    resourceMetadata: string;
  };
  fileNames: {
    controller: string;
    service: string;
    module: string;
    query: string;
    responseDto: string;
    createDto: string;
    updateDto: string;
    findQueryDto: string;
    idParamsDto: string;
    metadata: string;
  };
  endpoints: Record<ResourceEndpointName, NormalizedEndpointDefinition>;
  dto: ResourceDtoDefinition;
  guards: ResourceGuardsDefinition;
  query: Required<Pick<ResourceQueryDefinition, 'pagination'>> & Omit<ResourceQueryDefinition, 'pagination'>;
  openApi: Required<Pick<ResourceOpenApiDefinition, 'enabled'>> & ResourceOpenApiDefinition;
  validation?: {
    schemaSource: {
      sourceFile: string;
      accessExpression: string;
      importKind: 'default' | 'named' | 'namespace';
      importName: string;
      importSourceName: string;
    };
  };
  hooks?: NormalizedHooksDefinition;
  generatedDtos: {
    createFields: GeneratedDtoField[];
    responseFields: GeneratedDtoField[];
    idField: GeneratedDtoField | null;
  };
  source: {
    sourceFile: string;
    tableAccessExpression: string;
    tableImportKind: 'default' | 'named' | 'namespace';
    tableImportName: string;
    tableImportSourceName: string;
    tableQueryName: string;
    tableImportSourceFile: string;
  };
};

export type NormalizedApiKitConfig = Omit<ApiKitConfig, 'resources' | 'validation' | 'hooks'> & {
  cleanOutput: boolean;
  rootModuleClassName: string;
  rootModuleFileName: string;
  dbProviderToken?: string;
  dbSchemaSource?: {
    sourceFile: string;
    accessExpression: string;
    importKind: 'default' | 'named' | 'namespace';
    importName: string;
    importSourceName: string;
  };
  validation?: {
    engineName: 'zod' | 'custom';
    engineSource?: {
      sourceFile: string;
      accessExpression: string;
      importKind: 'default' | 'named' | 'namespace';
      importName: string;
      importSourceName: string;
    };
  };
  hooks?: NormalizedHooksDefinition;
  postGenerateCommand?: string;
  resources: NormalizedResourceDefinition[];
};
