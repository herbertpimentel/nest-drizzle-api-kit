---
to: <%= service %>
---
<% const context = JSON.parse(contextJson); const commonDbImportPath = context.imports.commonTypesImportPath.replace(/\/types$/, '/db'); %><%= context.generatedHeader %>
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
import { <%= context.resource.classNames.findQueryDto %> } from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.createDto %> } from './dto/<%= context.resource.fileNames.createDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.updateDto %> } from './dto/<%= context.resource.fileNames.updateDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.responseDto %> } from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.query %> } from './<%= context.resource.fileNames.query.replace('.ts', '') %>';

@Injectable()
export class <%= context.resource.classNames.service %> {
  constructor(
    @Inject(DB_PROVIDER_TOKEN)
    private readonly db: <% if (context.imports.dbSchemaAccessExpression) { %>NodePgDatabase<typeof schema><% } else { %>NodePgDatabase<{ <%= context.imports.tableQueryName %>: typeof <%= context.imports.tableAccessExpression %> }><% } %>,
  ) {}

  async find(query: <%= context.resource.classNames.findQueryDto %>): Promise<<% if (context.resource.query.pagination.enabled !== false) { %>PaginatedResult<<%= context.resource.classNames.responseDto %>><% } else { %><%= context.resource.classNames.responseDto %>[]<% } %>> {
    return new <%= context.resource.classNames.query %>(this.db).findMany(query);
  }

  async findOne(id: <%= context.resource.generatedDtos.idField?.tsType ?? 'string' %>, query: <%= context.resource.classNames.findQueryDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
    const row = await new <%= context.resource.classNames.query %>(this.db).findOne(id, query);

    return row as <%= context.resource.classNames.responseDto %>;
  }

  async create(body: <%= context.resource.classNames.createDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
    const rows = await this.db.insert(<%= context.imports.tableAccessExpression %>).values(body).returning();
    return rows[0] as <%= context.resource.classNames.responseDto %>;
  }

  async update(id: <%= context.resource.generatedDtos.idField?.tsType ?? 'string' %>, body: <%= context.resource.classNames.updateDto %>): Promise<<%= context.resource.classNames.responseDto %>> {
    const rows = await this.db
      .update(<%= context.imports.tableAccessExpression %>)
      .set(body)
      .where(eq(<%= context.imports.tableAccessExpression %>.<%= context.resource.generatedDtos.idField?.name ?? 'id' %>, id))
      .returning();

    return rows[0] as <%= context.resource.classNames.responseDto %>;
  }

  async delete(id: <%= context.resource.generatedDtos.idField?.tsType ?? 'string' %>): Promise<void> {
    await this.db.delete(<%= context.imports.tableAccessExpression %>).where(eq(<%= context.imports.tableAccessExpression %>.<%= context.resource.generatedDtos.idField?.name ?? 'id' %>, id));
  }
}
