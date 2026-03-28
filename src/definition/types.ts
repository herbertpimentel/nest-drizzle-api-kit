import type { DynamicModule, Type, CanActivate } from '@nestjs/common';

export type AnyPgTable = unknown;
export type DrizzleDb = {
  select: (...args: unknown[]) => {
    from: (table: unknown) => unknown;
  };
  insert: (table: unknown) => {
    values: (values: unknown) => {
      returning: () => Promise<unknown[]>;
    };
  };
  update: (table: unknown) => {
    set: (values: unknown) => {
      where: (condition: unknown) => {
        returning: () => Promise<unknown[]>;
      };
    };
  };
  delete: (table: unknown) => {
    where: (condition: unknown) => Promise<unknown>;
  };
};

export type ApiKitModuleOptions = {
  outputPath: string;
  resources: Array<ResourceDefinition> | Array<string>;
  db?: DrizzleDb;
  dbProviderToken?: string;
  dbSchema?: unknown | string;
  postGenerateCommand?: string;
  cleanOutput?: boolean;
  rootModuleClassName?: string;
  rootModuleFileName?: string;
};

export type ApiKitConfig = ApiKitModuleOptions;

export type ResourceEndpointName =
  | 'find'
  | 'findOne'
  | 'create'
  | 'update'
  | 'delete';

export type ResourceRouteDefinition = {
  basePath?: string;
  tag?: string;
};

export type ResourceFindEndpointDefinition = {
  enabled?: boolean;
};

export type ResourceFindOneEndpointDefinition = {
  enabled?: boolean;
};

export type ResourceCreateEndpointDefinition = {
  enabled?: boolean;
};

export type ResourceUpdateEndpointDefinition = {
  enabled?: boolean;
};

export type ResourceDeleteEndpointDefinition = {
  enabled?: boolean;
};

export type ResourceEndpointsDefinition = {
  find?: ResourceFindEndpointDefinition | false;
  findOne?: ResourceFindOneEndpointDefinition | false;
  create?: ResourceCreateEndpointDefinition | false;
  update?: ResourceUpdateEndpointDefinition | false;
  delete?: ResourceDeleteEndpointDefinition | false;
};

export type ClassReference<T = unknown> = Type<T>;

export type InputDtoDefinition =
  | {
      mode: 'custom';
      class: ClassReference;
    }
  | {
      mode?: 'generate';
      include?: string[];
      exclude?: string[];
      required?: string[];
      optional?: string[];
    };

export type ResponseDtoDefinition =
  | {
      mode: 'custom';
      class: ClassReference;
    }
  | {
      mode?: 'generate';
      include?: string[];
      exclude?: string[];
    };

export type QueryDtoDefinition =
  | {
      mode: 'custom';
      class: ClassReference;
    }
  | {
      mode?: 'generate';
    };

export type ParamsDtoDefinition =
  | {
      mode: 'custom';
      class: ClassReference;
    }
  | {
      mode?: 'generate';
    };

export type ResourceDtoDefinition = {
  response?: ResponseDtoDefinition;
  create?: InputDtoDefinition;
  update?: InputDtoDefinition;
  find?: QueryDtoDefinition;
  findOne?: ParamsDtoDefinition;
  delete?: ParamsDtoDefinition;
};

export type GuardDefinition = Type<CanActivate>;

export type ResourceGuardsDefinition = {
  resource?: GuardDefinition[];
  byEndpoint?: Partial<Record<ResourceEndpointName, GuardDefinition[]>>;
};

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

export type ResourceOpenApiDefinition = {
  enabled?: boolean;
  tag?: string;
  description?: string;
  summaryByEndpoint?: Partial<Record<ResourceEndpointName, string>>;
  descriptionByEndpoint?: Partial<Record<ResourceEndpointName, string>>;
};

export type ResourceDefinition = {
  name: string;
  table: AnyPgTable;
  relations?: unknown;
  route?: ResourceRouteDefinition;
  endpoints?: ResourceEndpointsDefinition;
  dto?: ResourceDtoDefinition;
  guards?: ResourceGuardsDefinition;
  openApi?: ResourceOpenApiDefinition;
  query?: ResourceQueryDefinition;
};

export type ApiKitModuleFactory = {
  forRoot(options: ApiKitModuleOptions): DynamicModule;
};
