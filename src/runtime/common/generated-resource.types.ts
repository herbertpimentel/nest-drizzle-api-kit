import type { AnyPgTable, DrizzleDb, ResourceDefinition } from '../../definition/types';

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};

export type GeneratedResourceRuntimeContext = {
  db: DrizzleDb;
  resource: ResourceDefinition;
  table: AnyPgTable;
  primaryKeyField: string;
};
