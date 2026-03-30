export { defineApiKitConfig } from './definition/define-api-kit-config';
export { defineResource } from './definition/define-resource';

export type {
  ApiKitModuleOptions,
  ApiKitConfig,
  ResourceDefinition,
  ResourceFunctionName,
  ResourceQueryDefinition,
  ResourceDocsDefinition,
  ResourceFunctionsDefinition,
  ResourceFunctionCommonDefinition,
  ResourceFindFunctionDefinition,
  ResourceFindOneFunctionDefinition,
  ResourceCreateFunctionDefinition,
  ResourceUpdateFunctionDefinition,
  ResourceDeleteFunctionDefinition,
  BodyInputDefinition,
  QueryInputDefinition,
  ParamsInputDefinition,
  OutputDefinition,
  ResourceHookContext,
  ResourceHook,
  ResourceHookReference,
  ResourceFunctionHooksDefinition,
  ApiKitHooksDefinition,
  ResourceFunctionValidationDefinition,
  ApiKitValidationDefinition,
  ValidationEngineName,
  ValidationEngineDefinition,
  ValidationEngine,
  ValidationResult,
  ValidationContext,
  ValidationFailureResult,
  ValidationSuccessResult,
  PaginationDefinition,
  FilterDefinition,
  SortDefinition,
  RelationIncludeDefinition,
  GuardDefinition,
} from './definition/types';

export { loadApiKitConfig } from './compiler/load-config';
export { validateApiKitConfig } from './compiler/validate-config';
export { normalizeApiKitConfig } from './compiler/normalize-config';
export { generateProject } from './generator/generate-project';
