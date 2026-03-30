---
to: <%= findInputDto %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
const definition = context.dto.findInput;
const filters = context.resource.query.filters ?? [];
const sorts = context.resource.query.sorts ?? [];
const relations = context.resource.query.relations ?? [];
const paginationEnabled = context.resource.query.pagination.enabled !== false;

function exampleValueForOperator(field, operator) {
  switch (operator) {
    case 'ilike':
    case 'like':
      return `%${field}%`;
    case 'in':
      return `${field}-a,${field}-b`;
    case 'isNull':
      return '';
    default:
      return field.includes('email') ? 'john@example.com' : field.includes('id') ? '123' : `sample-${field}`;
  }
}

function formatOperator(operator) {
  return `$${operator}`;
}

const allowedFiltersDescription = filters.length > 0
  ? filters.map((filter) => `${filter.field}: ${filter.operators.map(formatOperator).join(', ')}`).join('; ')
  : 'No filterable fields configured.';

const sortExamples = sorts.slice(0, 2).map((sort, index) => `${sort.field},${index === 0 ? 'ASC' : 'DESC'}`);
const relationExamples = relations.slice(0, 2).map((relation) => relation.name);

const searchExampleFields = filters.slice(0, 2).map((filter) => {
  const operator = filter.operators.includes('ilike') ? 'ilike' : filter.operators[0];
  if (operator === 'isNull') {
    return { [filter.field]: { [`$${operator}`]: true } };
  }

  return {
    [filter.field]: {
      [`$${operator}`]: exampleValueForOperator(filter.field, operator),
    },
  };
});

const searchExample = searchExampleFields.length === 0
  ? undefined
  : searchExampleFields.length === 1
    ? JSON.stringify(searchExampleFields[0])
    : JSON.stringify({ $or: searchExampleFields });

const sortQueryStringExample = sortExamples.length === 0
  ? undefined
  : sortExamples.map((value) => `sort=${value}`);

const includeQueryStringExample = relationExamples.length === 0
  ? undefined
  : relationExamples.map((value) => `include=${value}`);

const searchQueryStringExample = searchExample
  ? `search=${searchExample}`
  : undefined;
%><% if (definition) { %><%= context.generatedHeader %>
import { ApiPropertyOptional } from '@nestjs/swagger';
<% if (paginationEnabled) { %>
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
<% } else { %>
import { IsOptional } from 'class-validator';
<% } %>

export class <%= definition.className %> {
<% if (paginationEnabled) { %>
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: <%= context.resource.query.pagination.defaultPage %> })
  page?: number = <%= context.resource.query.pagination.defaultPage %>;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: <%= context.resource.query.pagination.defaultPageSize %> })
  pageSize?: number = <%= context.resource.query.pagination.defaultPageSize %>;
<% } %>

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Query string format: `?sort=field,ASC` or `?sort=field,DESC`. Allowed fields: <%= sorts.length > 0 ? sorts.map((sort) => sort.field).join(', ') : 'none' %>.',
<% if (sortQueryStringExample) { %>    example: <%- JSON.stringify(sortQueryStringExample.length === 1 ? sortQueryStringExample[0] : sortQueryStringExample) %>,
<% } %>  })
  sort?: string | string[];

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Query string format: `?include=relation`. Allowed relations: <%= relations.length > 0 ? relations.map((relation) => relation.name).join(', ') : 'none' %>.',
<% if (includeQueryStringExample) { %>    example: <%- JSON.stringify(includeQueryStringExample.length === 1 ? includeQueryStringExample[0] : includeQueryStringExample) %>,
<% } %>  })
  include?: string | string[];

  @IsOptional()
  @ApiPropertyOptional()
  fields?: string | string[];

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Query string format: `?search=JSON_STRING`. JSON payload supports nested `$and`/`$or` and uses only the allowed fields/operators: <%= allowedFiltersDescription %>',
<% if (searchQueryStringExample) { %>    example: <%- JSON.stringify(searchQueryStringExample) %>,
<% } %>  })
  search?: string;
}
<% } %>
