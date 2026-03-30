import type {
  ApiKitConfig,
  ResourceDefinition,
  ResourceDocsDefinition,
  ResourceFunctionName,
  ResourceQueryDefinition,
} from '../definition/types';
import type { GeneratedDtoField } from './dto-fields';

export type ImportedValueSource = {
  sourceFile: string;
  accessExpression: string;
  importKind: 'default' | 'named' | 'namespace';
  importName: string;
  importSourceName: string;
};

export type NormalizedHookDefinition = {
  sourceFile: string;
  suggestedName: string;
  description?: string;
};

export type NormalizedHookPhaseDefinition = {
  before: NormalizedHookDefinition[];
  after: NormalizedHookDefinition[];
};

export type NormalizedApiKitHooksDefinition = NormalizedHookPhaseDefinition & {
  functions: Record<ResourceFunctionName, NormalizedHookPhaseDefinition>;
};

export type NormalizedGeneratedDtoDefinition = {
  mode: 'generated';
  kind: 'body' | 'query' | 'params' | 'output';
  className: string;
  fileName: string;
  fields?: GeneratedDtoField[];
};

export type NormalizedCustomDtoDefinition = {
  mode: 'custom';
  kind: 'body' | 'query' | 'params' | 'output';
  source: ImportedValueSource;
};

export type NormalizedDtoDefinition = NormalizedGeneratedDtoDefinition | NormalizedCustomDtoDefinition;

export type NormalizedResourceFunctionDefinition = {
  name: ResourceFunctionName;
  enabled: boolean;
  transactional: boolean;
  operationId: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  guards: ImportedValueSource[];
  input: NormalizedDtoDefinition;
  output?: NormalizedDtoDefinition;
  validation?: ImportedValueSource;
  hooks: NormalizedHookPhaseDefinition;
};

export type NormalizedResourceDefinition = {
  original: ResourceDefinition;
  name: string;
  singularName: string;
  pluralName: string;
  basePath: string;
  docs: Required<Pick<ResourceDocsDefinition, 'enabled'>> & ResourceDocsDefinition;
  classNames: {
    controller: string;
    service: string;
    module: string;
    query: string;
  };
  fileNames: {
    controller: string;
    service: string;
    module: string;
    query: string;
  };
  guards: ImportedValueSource[];
  query: Omit<ResourceQueryDefinition, 'pagination'> & {
    pagination: {
      enabled: boolean;
      defaultPage: number;
      defaultPageSize: number;
      maxPageSize: number;
    };
  };
  functions: Record<ResourceFunctionName, NormalizedResourceFunctionDefinition>;
  generatedDtos: {
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
  dbSchemaSource?: ImportedValueSource;
  validation?: {
    engineSource?: ImportedValueSource;
  };
  hooks?: NormalizedApiKitHooksDefinition;
  postGenerateCommand?: string;
  resources: NormalizedResourceDefinition[];
};
