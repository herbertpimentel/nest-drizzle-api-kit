---
to: <%= service %>
---
<%
const context = JSON.parse(contextJson);
const commonDbImportPath = context.imports.commonTypesImportPath.replace(/\/types$/, '/db');
const hasValidation = Boolean(context.imports.validationImportPath);
const hasHooks = Boolean(context.imports.configHooksImportPath || context.imports.resourceHooksImportPath);
const dbType = context.imports.dbSchemaAccessExpression
  ? 'NodePgDatabase<typeof schema>'
  : `NodePgDatabase<{ ${context.imports.tableQueryName}: typeof ${context.imports.tableAccessExpression} }>`;
const findResultType = context.resource.query.pagination.enabled !== false
  ? `PaginatedResult<${context.resource.classNames.responseDto}>`
  : `${context.resource.classNames.responseDto}[]`;
const idType = context.resource.generatedDtos.idField?.tsType ?? 'string';
const idFieldName = context.resource.generatedDtos.idField?.name ?? 'id';
function endpointHooks(endpoint) {
  return (context.hooks && context.hooks[endpoint]) || { before: [], after: [] };
}
function hasEndpointHooks(endpoint) {
  const hooks = endpointHooks(endpoint);
  return hooks.before.length > 0 || hooks.after.length > 0;
}
function isTransactional(endpoint) {
  return Boolean(context.resource.endpoints[endpoint] && context.resource.endpoints[endpoint].transactional);
}
%><%= context.generatedHeader %>
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<% if (context.imports.tableImportKind === 'default') { %>import <%= context.imports.tableImportName %> from '<%= context.imports.tableImportPath %>';
<% } else if (context.imports.tableImportKind === 'namespace') { %>import * as <%= context.imports.tableImportName %> from '<%= context.imports.tableImportPath %>';
<% } else if (context.imports.tableImportName !== context.imports.tableImportSourceName) { %>import { <%= context.imports.tableImportSourceName %> as <%= context.imports.tableImportName %> } from '<%= context.imports.tableImportPath %>';
<% } else { %>import { <%= context.imports.tableImportName %> } from '<%= context.imports.tableImportPath %>';
<% } %>
import { <% if (context.imports.dbSchemaAccessExpression) { %>DB_PROVIDER_TOKEN, schema<% } else { %>DB_PROVIDER_TOKEN<% } %> } from '<%= commonDbImportPath %>';
<% if (context.resource.query.pagination.enabled !== false) { %>import type { PaginatedResult } from '<%= context.imports.commonTypesImportPath %>';
<% } %>
<% if (hasValidation) { %><% if (context.imports.validationImportKind === 'default') { %>import <%= context.imports.validationImportName %> from '<%= context.imports.validationImportPath %>';
<% } else if (context.imports.validationImportKind === 'namespace') { %>import * as <%= context.imports.validationImportName %> from '<%= context.imports.validationImportPath %>';
<% } else if (context.imports.validationImportName !== context.imports.validationImportSourceName) { %>import { <%= context.imports.validationImportSourceName %> as <%= context.imports.validationImportName %> } from '<%= context.imports.validationImportPath %>';
<% } else { %>import { <%= context.imports.validationImportName %> } from '<%= context.imports.validationImportPath %>';
<% } %>import { resolveResourceValidationSchema, validateResourceInput } from '<%= context.imports.commonValidationImportPath %>';
<% } %>
<% if (hasHooks) { %><% if (context.imports.configHooksImportPath) { %><% if (context.imports.configHooksImportKind === 'default') { %>import <%= context.imports.configHooksImportName %> from '<%= context.imports.configHooksImportPath %>';
<% } else if (context.imports.configHooksImportKind === 'namespace') { %>import * as <%= context.imports.configHooksImportName %> from '<%= context.imports.configHooksImportPath %>';
<% } else if (context.imports.configHooksImportName !== context.imports.configHooksImportSourceName) { %>import { <%= context.imports.configHooksImportSourceName %> as <%= context.imports.configHooksImportName %> } from '<%= context.imports.configHooksImportPath %>';
<% } else { %>import { <%= context.imports.configHooksImportName %> } from '<%= context.imports.configHooksImportPath %>';
<% } %><% } %><% if (context.imports.resourceHooksImportPath) { %><% if (context.imports.resourceHooksImportKind === 'default') { %>import <%= context.imports.resourceHooksImportName %> from '<%= context.imports.resourceHooksImportPath %>';
<% } else if (context.imports.resourceHooksImportKind === 'namespace') { %>import * as <%= context.imports.resourceHooksImportName %> from '<%= context.imports.resourceHooksImportPath %>';
<% } else if (context.imports.resourceHooksImportName !== context.imports.resourceHooksImportSourceName) { %>import { <%= context.imports.resourceHooksImportSourceName %> as <%= context.imports.resourceHooksImportName %> } from '<%= context.imports.resourceHooksImportPath %>';
<% } else { %>import { <%= context.imports.resourceHooksImportName %> } from '<%= context.imports.resourceHooksImportPath %>';
<% } %><% } %>import { resolveResourceHook } from '<%= context.imports.commonHooksImportPath %>';
<% } %>
import { <%= context.resource.classNames.findQueryDto %> } from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.createDto %> } from './dto/<%= context.resource.fileNames.createDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.updateDto %> } from './dto/<%= context.resource.fileNames.updateDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.responseDto %> } from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.query %> } from './<%= context.resource.fileNames.query.replace('.ts', '') %>';

<% if (hasValidation && context.resource.endpoints.find.enabled) { %>const findValidationSchema = resolveResourceValidationSchema(<%= context.imports.validationAccessExpression %>, 'find');
<% } %><% if (hasValidation && context.resource.endpoints.findOne.enabled) { %>const findOneValidationSchema = resolveResourceValidationSchema(<%= context.imports.validationAccessExpression %>, 'findOne');
<% } %><% if (hasValidation && context.resource.endpoints.create.enabled) { %>const createValidationSchema = resolveResourceValidationSchema(<%= context.imports.validationAccessExpression %>, 'create');
<% } %><% if (hasValidation && context.resource.endpoints.update.enabled) { %>const updateValidationSchema = resolveResourceValidationSchema(<%= context.imports.validationAccessExpression %>, 'update');
<% } %><% if (hasValidation && context.resource.endpoints.delete.enabled) { %>const deleteValidationSchema = resolveResourceValidationSchema(<%= context.imports.validationAccessExpression %>, 'delete');
<% } %>

@Injectable()
export class <%= context.resource.classNames.service %> {
  constructor(
    @Inject(DB_PROVIDER_TOKEN)
    private readonly db: <%= dbType %>,
  ) {}

  async find(query: <%= context.resource.classNames.findQueryDto %>): Promise<<%= findResultType %>> {
<% if (hasEndpointHooks('find')) { %><% if (hasValidation && context.resource.endpoints.find.enabled) { %>    const validatedQuery = validateResourceInput(findValidationSchema, query);
<% } else { %>    const input = query;
<% } %><% for (const hook of endpointHooks('find').before) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %><% for (const hook of endpointHooks('find').after) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %>
    const context = {
      db: this.db,
      resourceName: '<%= context.resource.name %>',
      endpoint: 'find' as const,
      state: new Map<string, unknown>(),
      input: <% if (hasValidation && context.resource.endpoints.find.enabled) { %>validatedQuery<% } else { %>input<% } %>,
      result: undefined as <%= findResultType %> | undefined,
    };

<% for (const hook of endpointHooks('find').before) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>    context.result = await new <%= context.resource.classNames.query %>(this.db).findMany(context.input);
<% for (const hook of endpointHooks('find').after) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>
    return context.result as <%= findResultType %>;
<% } else if (hasValidation && context.resource.endpoints.find.enabled) { %>    const validatedQuery = validateResourceInput(findValidationSchema, query);
    return new <%= context.resource.classNames.query %>(this.db).findMany(validatedQuery);
<% } else { %>    return new <%= context.resource.classNames.query %>(this.db).findMany(query);
<% } %>  }

  async findOne(id: <%= idType %>, query: <%= context.resource.classNames.findQueryDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
<% if (hasEndpointHooks('findOne')) { %><% if (hasValidation && context.resource.endpoints.findOne.enabled) { %>    const input = validateResourceInput(findOneValidationSchema, { params: { id }, query });
<% } else { %>    const input = { params: { id }, query };
<% } %><% for (const hook of endpointHooks('findOne').before) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %><% for (const hook of endpointHooks('findOne').after) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %>
    const context = {
      db: this.db,
      resourceName: '<%= context.resource.name %>',
      endpoint: 'findOne' as const,
      state: new Map<string, unknown>(),
      input,
      result: undefined as <%= context.resource.classNames.responseDto %> | undefined,
    };

<% for (const hook of endpointHooks('findOne').before) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>    const row = await new <%= context.resource.classNames.query %>(this.db).findOne(context.input.params.id, context.input.query);
    context.result = row as <%= context.resource.classNames.responseDto %>;
<% for (const hook of endpointHooks('findOne').after) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>
    return context.result as <%= context.resource.classNames.responseDto %>;
<% } else if (hasValidation && context.resource.endpoints.findOne.enabled) { %>    const input = validateResourceInput(findOneValidationSchema, { params: { id }, query });
    const row = await new <%= context.resource.classNames.query %>(this.db).findOne(input.params.id, input.query);
<% } else { %>    const row = await new <%= context.resource.classNames.query %>(this.db).findOne(id, query);
<% } %>

<% if (!hasEndpointHooks('findOne')) { %>    return row as <%= context.resource.classNames.responseDto %>;
<% } %>  }

  async create(body: <%= context.resource.classNames.createDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
<% if (hasEndpointHooks('create')) { %><% if (hasValidation && context.resource.endpoints.create.enabled) { %>    const validatedBody = validateResourceInput(createValidationSchema, body);
<% } else { %>    const input = body;
<% } %><% for (const hook of endpointHooks('create').before) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %><% for (const hook of endpointHooks('create').after) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %>
<% if (isTransactional('create')) { %>    return this.db.transaction(async (tx) => {
      const context = {
        db: tx,
        resourceName: '<%= context.resource.name %>',
        endpoint: 'create' as const,
        state: new Map<string, unknown>(),
        input: <% if (hasValidation && context.resource.endpoints.create.enabled) { %>validatedBody<% } else { %>input<% } %>,
        result: undefined as <%= context.resource.classNames.responseDto %> | undefined,
      };

<% for (const hook of endpointHooks('create').before) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>      const rows = await tx.insert(<%= context.imports.tableAccessExpression %>).values(context.input).returning();
      context.result = rows[0] as <%= context.resource.classNames.responseDto %>;
<% for (const hook of endpointHooks('create').after) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>
      return context.result as <%= context.resource.classNames.responseDto %>;
    });
<% } else { %>    const context = {
      db: this.db,
      resourceName: '<%= context.resource.name %>',
      endpoint: 'create' as const,
      state: new Map<string, unknown>(),
      input: <% if (hasValidation && context.resource.endpoints.create.enabled) { %>validatedBody<% } else { %>input<% } %>,
      result: undefined as <%= context.resource.classNames.responseDto %> | undefined,
    };

<% for (const hook of endpointHooks('create').before) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>    const rows = await this.db.insert(<%= context.imports.tableAccessExpression %>).values(context.input).returning();
    context.result = rows[0] as <%= context.resource.classNames.responseDto %>;
<% for (const hook of endpointHooks('create').after) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>
    return context.result as <%= context.resource.classNames.responseDto %>;
<% } %><% } else if (isTransactional('create')) { %><% if (hasValidation && context.resource.endpoints.create.enabled) { %>    const validatedBody = validateResourceInput(createValidationSchema, body);
    return this.db.transaction(async (tx) => {
      const rows = await tx.insert(<%= context.imports.tableAccessExpression %>).values(validatedBody).returning();
      return rows[0] as <%= context.resource.classNames.responseDto %>;
    });
<% } else { %>    return this.db.transaction(async (tx) => {
      const rows = await tx.insert(<%= context.imports.tableAccessExpression %>).values(body).returning();
      return rows[0] as <%= context.resource.classNames.responseDto %>;
    });
<% } %><% } else if (hasValidation && context.resource.endpoints.create.enabled) { %>    const validatedBody = validateResourceInput(createValidationSchema, body);
    const rows = await this.db.insert(<%= context.imports.tableAccessExpression %>).values(validatedBody).returning();
    return rows[0] as <%= context.resource.classNames.responseDto %>;
<% } else { %>    const rows = await this.db.insert(<%= context.imports.tableAccessExpression %>).values(body).returning();
    return rows[0] as <%= context.resource.classNames.responseDto %>;
<% } %>  }

  async update(id: <%= idType %>, body: <%= context.resource.classNames.updateDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
<% if (hasEndpointHooks('update')) { %><% if (hasValidation && context.resource.endpoints.update.enabled) { %>    const input = validateResourceInput(updateValidationSchema, { params: { id }, body });
<% } else { %>    const input = { params: { id }, body };
<% } %><% for (const hook of endpointHooks('update').before) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %><% for (const hook of endpointHooks('update').after) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %>
<% if (isTransactional('update')) { %>    return this.db.transaction(async (tx) => {
      const context = {
        db: tx,
        resourceName: '<%= context.resource.name %>',
        endpoint: 'update' as const,
        state: new Map<string, unknown>(),
        input,
        result: undefined as <%= context.resource.classNames.responseDto %> | undefined,
      };

<% for (const hook of endpointHooks('update').before) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>      const rows = await tx
        .update(<%= context.imports.tableAccessExpression %>)
        .set(context.input.body)
        .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, context.input.params.id))
        .returning();
      context.result = rows[0] as <%= context.resource.classNames.responseDto %>;
<% for (const hook of endpointHooks('update').after) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>
      return context.result as <%= context.resource.classNames.responseDto %>;
    });
<% } else { %>    const context = {
      db: this.db,
      resourceName: '<%= context.resource.name %>',
      endpoint: 'update' as const,
      state: new Map<string, unknown>(),
      input,
      result: undefined as <%= context.resource.classNames.responseDto %> | undefined,
    };

<% for (const hook of endpointHooks('update').before) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>    const rows = await this.db
      .update(<%= context.imports.tableAccessExpression %>)
      .set(context.input.body)
      .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, context.input.params.id))
      .returning();
    context.result = rows[0] as <%= context.resource.classNames.responseDto %>;
<% for (const hook of endpointHooks('update').after) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>
    return context.result as <%= context.resource.classNames.responseDto %>;
<% } %><% } else if (isTransactional('update')) { %><% if (hasValidation && context.resource.endpoints.update.enabled) { %>    const input = validateResourceInput(updateValidationSchema, { params: { id }, body });
    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(<%= context.imports.tableAccessExpression %>)
        .set(input.body)
        .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, input.params.id))
        .returning();
      return rows[0] as <%= context.resource.classNames.responseDto %>;
    });
<% } else { %>    return this.db.transaction(async (tx) => {
      const rows = await tx
        .update(<%= context.imports.tableAccessExpression %>)
        .set(body)
        .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, id))
        .returning();
      return rows[0] as <%= context.resource.classNames.responseDto %>;
    });
<% } %><% } else if (hasValidation && context.resource.endpoints.update.enabled) { %>    const input = validateResourceInput(updateValidationSchema, { params: { id }, body });
    const rows = await this.db
      .update(<%= context.imports.tableAccessExpression %>)
      .set(input.body)
      .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, input.params.id))
      .returning();
    return rows[0] as <%= context.resource.classNames.responseDto %>;
<% } else { %>    const rows = await this.db
      .update(<%= context.imports.tableAccessExpression %>)
      .set(body)
      .where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, id))
      .returning();
    return rows[0] as <%= context.resource.classNames.responseDto %>;
<% } %>  }

  async delete(id: <%= idType %>): Promise<void> {
<% if (hasEndpointHooks('delete')) { %><% if (hasValidation && context.resource.endpoints.delete.enabled) { %>    const input = validateResourceInput(deleteValidationSchema, { params: { id } });
<% } else { %>    const input = { params: { id } };
<% } %><% for (const hook of endpointHooks('delete').before) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %><% for (const hook of endpointHooks('delete').after) { %>    const <%= hook.constName %> = resolveResourceHook(<%= hook.resolveExpression %>);
<% } %>
<% if (isTransactional('delete')) { %>    return this.db.transaction(async (tx) => {
      const context = {
        db: tx,
        resourceName: '<%= context.resource.name %>',
        endpoint: 'delete' as const,
        state: new Map<string, unknown>(),
        input,
        result: undefined as void | undefined,
      };

<% for (const hook of endpointHooks('delete').before) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>      await tx.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, context.input.params.id));
<% for (const hook of endpointHooks('delete').after) { %><% if (hook.description) { %>      // <%= hook.description %>
<% } %>      await <%= hook.constName %>(context);
<% } %>
      return;
    });
<% } else { %>    const context = {
      db: this.db,
      resourceName: '<%= context.resource.name %>',
      endpoint: 'delete' as const,
      state: new Map<string, unknown>(),
      input,
      result: undefined as void | undefined,
    };

<% for (const hook of endpointHooks('delete').before) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>    await this.db.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, context.input.params.id));
<% for (const hook of endpointHooks('delete').after) { %><% if (hook.description) { %>    // <%= hook.description %>
<% } %>    await <%= hook.constName %>(context);
<% } %>
    return;
<% } %><% } else if (isTransactional('delete')) { %><% if (hasValidation && context.resource.endpoints.delete.enabled) { %>    const input = validateResourceInput(deleteValidationSchema, { params: { id } });
    return this.db.transaction(async (tx) => {
      await tx.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, input.params.id));
      return;
    });
<% } else { %>    return this.db.transaction(async (tx) => {
      await tx.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, id));
      return;
    });
<% } %><% } else if (hasValidation && context.resource.endpoints.delete.enabled) { %>    const input = validateResourceInput(deleteValidationSchema, { params: { id } });
    await this.db.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, input.params.id));
<% } else { %>    await this.db.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= idFieldName %>, id));
<% } %>  }
}
