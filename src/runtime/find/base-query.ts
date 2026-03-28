export type ResourceBaseQueryContext<TQueryBuilder = unknown, TTable = unknown> = {
  qb: TQueryBuilder;
  table: TTable;
};

export interface ResourceBaseQuery<
  TTable = unknown,
  TQueryContext extends ResourceBaseQueryContext = ResourceBaseQueryContext,
  TQueryBuilder = unknown,
> {
  apply(ctx: TQueryContext): TQueryBuilder;
}

export abstract class ResourceBaseQueryBase<
  TTable = unknown,
  TQueryContext extends ResourceBaseQueryContext = ResourceBaseQueryContext,
  TQueryBuilder = unknown,
> implements ResourceBaseQuery<TTable, TQueryContext, TQueryBuilder>
{
  abstract apply(ctx: TQueryContext): TQueryBuilder;
}
