import { and, asc, count, desc, eq, getTableColumns, ilike, inArray, like, ne } from 'drizzle-orm';
import type { FilterDefinition, SortDefinition } from '../../definition/types';
import type { PaginatedResult, GeneratedResourceRuntimeContext } from '../common/generated-resource.types';

type TableColumnsInput = Parameters<typeof getTableColumns>[0];

type FindQueryInput = {
  page?: number;
  pageSize?: number;
  sort?: string;
  include?: string;
  [key: string]: unknown;
};

function toNumber(value: unknown, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function buildFilterCondition(
  field: FilterDefinition,
  value: unknown,
  columns: Record<string, unknown>,
): unknown | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const column = columns[field.field] as any;
  const firstOperator = field.operators[0];

  switch (firstOperator) {
    case 'eq':
      return eq(column, value);
    case 'ne':
      return ne(column, value);
    case 'like':
      return like(column as any, String(value));
    case 'ilike':
      return ilike(column as any, String(value));
    case 'in':
      return inArray(column as any, Array.isArray(value) ? value : String(value).split(',').map((item) => item.trim()));
    default:
      return eq(column as any, value);
  }
}

function buildOrderBy(
  sortValue: unknown,
  columns: Record<string, unknown>,
  sorts: SortDefinition[] | undefined,
): unknown[] {
  const allowedSorts = new Map((sorts ?? []).map((sort) => [sort.field, sort]));
  if (!sortValue || typeof sortValue !== 'string') {
    const defaultSort = (sorts ?? []).find((sort) => sort.defaultOrder);
    if (!defaultSort) {
      return [];
    }
      const column = columns[defaultSort.field] as any;
    return [defaultSort.defaultOrder === 'desc' ? desc(column) : asc(column)];
  }

  return sortValue
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const isDesc = part.startsWith('-');
      const name = isDesc ? part.slice(1) : part;
      if (!allowedSorts.has(name)) {
        return [];
      }
      const column = columns[name] as any;
      return [isDesc ? desc(column) : asc(column)];
    });
}

export class GeneratedFindHandler<TFindQuery extends FindQueryInput = FindQueryInput, TResponseDto = unknown> {
  constructor(private readonly context: GeneratedResourceRuntimeContext) {}

  async execute(query: TFindQuery): Promise<PaginatedResult<TResponseDto>> {
    const columns = getTableColumns(this.context.table as TableColumnsInput);
    const filterDefinitions = this.context.resource.query?.filters ?? [];
    const conditions = filterDefinitions
      .map((field) => buildFilterCondition(field, query[field.field], columns as Record<string, unknown>))
      .filter((condition): condition is NonNullable<typeof condition> => condition !== null);

    const pagination = this.context.resource.query?.pagination;
    const paginationOptions = typeof pagination === 'object' && pagination !== null ? pagination : undefined;
    const page = toNumber(query.page, paginationOptions?.defaultPage ?? 1);
    const pageSize = Math.min(
      toNumber(query.pageSize, paginationOptions?.defaultPageSize ?? 20),
      paginationOptions?.maxPageSize ?? 100,
    );

    let selectQuery = (this.context.db as any).select().from(this.context.table) as {
      where: (condition: unknown) => typeof selectQuery;
      orderBy: (...clauses: unknown[]) => typeof selectQuery;
      limit: (value: number) => typeof selectQuery;
      offset: (value: number) => Promise<TResponseDto[]>;
    };

    if (this.context.resource.query?.baseQuery) {
      const BaseQuery = this.context.resource.query.baseQuery as new () => {
        apply: (ctx: { qb: any; table: any }) => any;
      };
      const baseQuery = new BaseQuery();
      selectQuery = baseQuery.apply({ qb: selectQuery, table: this.context.table }) as typeof selectQuery;
    }

    if (conditions.length > 0) {
      selectQuery = selectQuery.where(and(...(conditions as any[])));
    }

    const orderByClauses = buildOrderBy(query.sort, columns as Record<string, unknown>, this.context.resource.query?.sorts);
    if (orderByClauses.length > 0) {
      selectQuery = selectQuery.orderBy(...orderByClauses);
    }

    const items = await selectQuery.limit(pageSize).offset((page - 1) * pageSize);

    const totalQuery = (this.context.db as any).select({ total: count() }).from(this.context.table) as {
      where: (condition: unknown) => Promise<Array<{ total: number }>>;
    };

    const totalRows = (conditions.length > 0
      ? await totalQuery.where(and(...(conditions as any[])))
      : await totalQuery) as Array<{ total: number }>;
    const total = Number(totalRows[0]?.total ?? items.length);

    return {
      items,
      page,
      pageSize,
      total,
    };
  }
}
