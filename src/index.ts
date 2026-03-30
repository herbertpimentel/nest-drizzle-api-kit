export { ApiKitModule } from './runtime/api-kit.module';
export { defineApiKitConfig } from './definition/define-api-kit-config';
export { defineResource } from './definition/define-resource';

export {
  ResourceBaseQueryBase,
  type ResourceBaseQuery,
  type ResourceBaseQueryContext,
} from './runtime/find/base-query';

export { ResourceExtensionControllerBase } from './runtime/extensions/resource-extension-controller.base';

export type {
  ApiKitModuleOptions,
  ApiKitConfig,
  ResourceDefinition,
  ResourceEndpointName,
  ResourceEndpointsDefinition,
  ResourceGuardsDefinition,
  ResourceQueryDefinition,
  ResourceOpenApiDefinition,
  ResourceRouteDefinition,
  ResourceDtoDefinition,
  ResourceValidationDefinition,
  ResourceValidationSchemaDefinition,
  ResourceHookContext,
  ResourceHook,
  ResourceHookEntry,
  ResourceHookPhaseDefinition,
  ResourceHooksDefinition,
  ResourceHooksSourceDefinition,
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
