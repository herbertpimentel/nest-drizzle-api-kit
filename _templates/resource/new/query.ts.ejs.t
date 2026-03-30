---
to: <%= query %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { <%= context.render.query.drizzleImports %> } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<%- context.render.query.tableImport %>

<% if (context.render.query.schemaImport) { %><%- context.render.query.schemaImport %>
<% } %>
<% if (context.render.query.paginationImport) { %><%- context.render.query.paginationImport %>
<% } %>
<%- context.render.query.commonQueryImport %>
import type { <%= context.resource.classNames.findQueryDto %> } from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
import type { <%= context.resource.classNames.responseDto %> } from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';

export class <%= context.resource.classNames.query %> extends GeneratedResourceQueryBase {
  constructor(
    private readonly db: <%- context.render.query.dbType %>,
  ) {
    super();
  }

<%- context.render.query.findManyMethod %>

<%- context.render.query.findOneMethod %>

<%- context.render.query.resolveConditionMethod %>
<% if (context.render.query.resolveOrderByMethod) { %>
<%- context.render.query.resolveOrderByMethod %>
<% } %>

}
