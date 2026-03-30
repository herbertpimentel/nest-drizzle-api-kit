---
to: <%= query %>
---
<%
const context = JSON.parse(contextJson);
const commonDbImportPath = context.imports.commonTypesImportPath.replace(/\/types$/, '/db');
const filters = context.resource.query.filters ?? [];
const sorts = context.resource.query.sorts ?? [];
const relations = context.resource.query.relations ?? [];
const paginationEnabled = context.resource.query.pagination.enabled !== false;
const drizzleImports = ['eq'];
if (paginationEnabled) drizzleImports.unshift('count');
const commonQueryImports = [
  'buildAllowedColumnCondition',
  ...(relations.length > 0 ? ['buildRequestedRelations'] : []),
  'GeneratedResourceQueryBase',
  ...(paginationEnabled ? ['toPositiveNumber'] : []),
];
const dbType = context.imports.dbSchemaAccessExpression
  ? 'NodePgDatabase<typeof schema>'
  : `NodePgDatabase<{ ${context.imports.tableQueryName}: typeof ${context.imports.tableAccessExpression} }>`;
const findManyReturnType = paginationEnabled
  ? `PaginatedResult<${context.resource.classNames.responseDto}>`
  : `${context.resource.classNames.responseDto}[]`;
if (sorts.length > 0) drizzleImports.push('asc', 'desc');
%><%= context.generatedHeader %>
import { <%= drizzleImports.join(', ') %> } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<% if (context.imports.tableImportKind === 'default') { %>import <%= context.imports.tableImportName %> from '<%= context.imports.tableImportPath %>';
<% } else if (context.imports.tableImportKind === 'namespace') { %>import * as <%= context.imports.tableImportName %> from '<%= context.imports.tableImportPath %>';
<% } else if (context.imports.tableImportName !== context.imports.tableImportSourceName) { %>import { <%= context.imports.tableImportSourceName %> as <%= context.imports.tableImportName %> } from '<%= context.imports.tableImportPath %>';
<% } else { %>import { <%= context.imports.tableImportName %> } from '<%= context.imports.tableImportPath %>';
<% } %>
<% if (context.imports.dbSchemaAccessExpression) { %>import { schema } from '<%= commonDbImportPath %>';
<% } %>
<% if (paginationEnabled) { %>import type { PaginatedResult } from '<%= context.imports.commonTypesImportPath %>';
<% } %>
import {
  <%= commonQueryImports.join(',\n  ') %>,
  type ParsedFilter,
} from '<%= context.imports.commonQueryImportPath %>';
import type { <%= context.resource.classNames.findQueryDto %> } from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
import type { <%= context.resource.classNames.responseDto %> } from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';

export class <%= context.resource.classNames.query %> extends GeneratedResourceQueryBase {
  constructor(
    private readonly db: <%- dbType %>,
  ) {
    super();
  }

  async findMany(query: <%= context.resource.classNames.findQueryDto %>): Promise<<%- findManyReturnType %>> {
<% if (paginationEnabled) { %>    const page = toPositiveNumber(query.page, <%= context.resource.query.pagination.defaultPage %>);
    const pageSize = Math.min(
      toPositiveNumber(query.pageSize, <%= context.resource.query.pagination.defaultPageSize %>),
      <%= context.resource.query.pagination.maxPageSize %>,
    );
<% } %>
    const where = this.buildWhere(query.search, (filter) => this.resolveCondition(filter));
<% if (relations.length > 0) { %>    const withRelations = buildRequestedRelations(query.include, [<% for (const relation of relations) { %>'<%= relation.name %>'<%= relation === relations[relations.length - 1] ? '' : ', ' %><% } %>] as const);
<% } %><% if (sorts.length > 0) { %>    const orderByClauses = this.buildOrderBy(
      query.sort,
      (fieldName, isDesc) => this.resolveOrderBy(fieldName, isDesc),
      [<% for (const sort of sorts) { if (sort.defaultOrder) { %><%= sort.defaultOrder === 'desc' ? 'desc' : 'asc' %>(<%= context.imports.tableAccessExpression %>.<%= sort.field %>), <% } } %>],
    );
<% } else { %>    const orderByClauses = [];
<% } %>
    const items = await this.db.query.<%= context.imports.tableQueryName %>.findMany({
      ...(where ? { where } : {}),
<% if (relations.length > 0) { %>      ...(withRelations ? { with: withRelations } : {}),
<% } %>      ...(orderByClauses.length > 0 ? { orderBy: orderByClauses } : {}),
<% if (paginationEnabled) { %>
      limit: pageSize,
      offset: (page - 1) * pageSize,
<% } %>
    });

<% if (paginationEnabled) { %>    let totalQuery = this.db.select({ total: count() }).from(<%= context.imports.tableAccessExpression %>).$dynamic();
    if (where) {
      totalQuery = totalQuery.where(where);
    }
    const totalRows = await totalQuery;
    const total = totalRows[0]?.total;

    return {
      items: items as <%= context.resource.classNames.responseDto %>[],
      page,
      pageSize,
      total: Number(total ?? items.length),
    };
<% } else { %>    return items as <%= context.resource.classNames.responseDto %>[];
<% } %>
  }

  async findOne(
    id: <%= context.resource.generatedDtos.idField?.tsType ?? 'string' %>,
    query: <%= context.resource.classNames.findQueryDto %>,
  ): Promise<<%= context.resource.classNames.responseDto %> | undefined> {
    const where = this.buildWhere(
      query.search,
      (filter) => this.resolveCondition(filter),
      eq(<%= context.imports.tableAccessExpression %>.<%= context.resource.generatedDtos.idField?.name ?? 'id' %>, id),
    );
<% if (relations.length > 0) { %>    const withRelations = buildRequestedRelations(query.include, [<% for (const relation of relations) { %>'<%= relation.name %>'<%= relation === relations[relations.length - 1] ? '' : ', ' %><% } %>] as const);
<% } %>
    const row = await this.db.query.<%= context.imports.tableQueryName %>.findFirst({
      ...(where ? { where } : {}),
<% if (relations.length > 0) { %>      ...(withRelations ? { with: withRelations } : {}),
<% } %>    });

    return row as <%= context.resource.classNames.responseDto %> | undefined;
  }

  protected resolveCondition(filter: ParsedFilter) {
    switch (filter.field) {
<% for (const filter of filters) { %>      case '<%= filter.field %>':
        return buildAllowedColumnCondition(
          <%= context.imports.tableAccessExpression %>.<%= filter.field %>,
          filter.operator,
          filter.value,
          <%- JSON.stringify(filter.operators) %> as const,
        );
<% } %>      default:
        return null;
    }
  }

<% if (sorts.length > 0) { %>  private resolveOrderBy(fieldName: string, isDesc: boolean) {
    switch (fieldName) {
<% for (const sort of sorts) { %>      case '<%= sort.field %>':
        return isDesc ? desc(<%= context.imports.tableAccessExpression %>.<%= sort.field %>) : asc(<%= context.imports.tableAccessExpression %>.<%= sort.field %>);
<% } %>      default:
        return null;
    }
  }
<% } %>
}
