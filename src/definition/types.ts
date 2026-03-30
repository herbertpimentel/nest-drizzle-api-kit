export type AnyPgTable = unknown;
export type Constructor<T = unknown> = abstract new (...args: unknown[]) => T;

export type ResourceFunctionName = 'find' | 'findOne' | 'create' | 'update' | 'delete';

export type ClassReference<T = unknown> = Constructor<T>;

export type GuardDefinition = Constructor<{
  canActivate?: (...args: unknown[]) => unknown;
}>;

export type PaginationDefinition = {
  enabled?: boolean;
  defaultPage?: number;
  defaultPageSize?: number;
  maxPageSize?: number;
};

export type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'like'
  | 'ilike'
  | 'in'
  | 'isNull';

export type FilterDefinition = {
  field: string;
  operators: FilterOperator[];
};

export type SortDefinition = {
  field: string;
  defaultOrder?: 'asc' | 'desc';
};

export type RelationIncludeDefinition = {
  name: string;
};

export type BaseQueryClassReference = ClassReference;

export type ResourceQueryDefinition = {
  pagination?: PaginationDefinition | boolean;
  filters?: FilterDefinition[];
  sorts?: SortDefinition[];
  relations?: RelationIncludeDefinition[];
  baseQuery?: BaseQueryClassReference;
};

export type ResourceDocsDefinition = {
  enabled?: boolean;
  tags?: string[];
  description?: string;
};

export type GeneratedBodyInputDefinition = {
  mode?: 'generate';
  include?: string[];
  exclude?: string[];
  required?: string[];
  optional?: string[];
};

export type CustomClassDefinition = {
  mode: 'custom';
  class: ClassReference;
};

export type BodyInputDefinition = GeneratedBodyInputDefinition | CustomClassDefinition;

export type GeneratedOutputDefinition = {
  mode?: 'generate';
  include?: string[];
  exclude?: string[];
};

export type OutputDefinition = GeneratedOutputDefinition | CustomClassDefinition;

export type GeneratedQueryInputDefinition = {
  mode?: 'generate';
};

export type QueryInputDefinition = GeneratedQueryInputDefinition | CustomClassDefinition;

export type GeneratedParamsInputDefinition = {
  mode?: 'generate';
};

export type ParamsInputDefinition = GeneratedParamsInputDefinition | CustomClassDefinition;

export type ResourceFunctionValidationDefinition = string | unknown;

export type ResourceHookContext<TInput = unknown, TResult = unknown, TDb = unknown> = {
  db: TDb;
  resourceName: string;
  functionName: ResourceFunctionName;
  state: Map<string, unknown>;
  input: TInput;
  result?: TResult;
};

export type ResourceHook<TInput = unknown, TResult = unknown, TDb = unknown> = (
  context: ResourceHookContext<TInput, TResult, TDb>,
) => void | Promise<void>;

export type ResourceHookReference =
  | string
  | {
      path: string;
      name?: string;
      description?: string;
    };

export type ResourceFunctionHooksDefinition = {
  before?: ResourceHookReference[];
  after?: ResourceHookReference[];
};

export type ApiKitHooksDefinition = ResourceFunctionHooksDefinition & Partial<Record<ResourceFunctionName, ResourceFunctionHooksDefinition>>;

export type ResourceFunctionCommonDefinition = {
  enabled?: boolean;
  guards?: GuardDefinition[];
  summary?: string;
  description?: string;
  validation?: ResourceFunctionValidationDefinition;
  hooks?: ResourceFunctionHooksDefinition;
};

export type ResourceFindFunctionDefinition = ResourceFunctionCommonDefinition & {
  input?: QueryInputDefinition;
  output?: OutputDefinition;
};

export type ResourceFindOneFunctionDefinition = ResourceFunctionCommonDefinition & {
  input?: ParamsInputDefinition;
  output?: OutputDefinition;
};

export type ResourceCreateFunctionDefinition = ResourceFunctionCommonDefinition & {
  transactional?: boolean;
  input?: BodyInputDefinition;
  output?: OutputDefinition;
};

export type ResourceUpdateFunctionDefinition = ResourceFunctionCommonDefinition & {
  transactional?: boolean;
  input?: BodyInputDefinition;
  output?: OutputDefinition;
};

export type ResourceDeleteFunctionDefinition = ResourceFunctionCommonDefinition & {
  transactional?: boolean;
  input?: ParamsInputDefinition;
};

export type ResourceFunctionsDefinition = {
  find?: ResourceFindFunctionDefinition;
  findOne?: ResourceFindOneFunctionDefinition;
  create?: ResourceCreateFunctionDefinition;
  update?: ResourceUpdateFunctionDefinition;
  delete?: ResourceDeleteFunctionDefinition;
};

export type ValidationEngineName = 'zod';

export type ValidationSuccessResult<T = unknown> = {
  success: true;
  data: T;
};

export type ValidationFailureResult = {
  success: false;
  errors: unknown;
};

export type ValidationResult<T = unknown> = ValidationSuccessResult<T> | ValidationFailureResult;

export type ValidationContext = {
  schema: unknown;
  input: unknown;
};

export type ValidationEngine = {
  validate: (context: ValidationContext) => ValidationResult;
};

export type ValidationEngineDefinition = ValidationEngineName | ValidationEngine | string;

export type ApiKitValidationDefinition = {
  engine?: ValidationEngineDefinition;
};

export type ResourceDefinition = {
  name: string;
  basePath?: string;
  table: AnyPgTable;
  guards?: GuardDefinition[];
  docs?: ResourceDocsDefinition;
  query?: ResourceQueryDefinition;
  functions?: ResourceFunctionsDefinition;
};

export type ApiKitModuleOptions = {
  outputPath: string;
  resources: Array<ResourceDefinition> | Array<string>;
  dbProviderToken?: string;
  dbSchema?: unknown | string;
  validation?: ApiKitValidationDefinition;
  hooks?: ApiKitHooksDefinition;
  postGenerateCommand?: string;
  cleanOutput?: boolean;
  rootModuleClassName?: string;
  rootModuleFileName?: string;
};

export type ApiKitConfig = ApiKitModuleOptions;
