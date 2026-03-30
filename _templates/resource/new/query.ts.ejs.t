---
to: <%= query %>
---
<% 
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
<% if (context.query.drizzleImports) { %>import { <%= context.query.drizzleImports %> } from 'drizzle-orm';
<% } %>
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<%- context.query.importsBlock %>

export class <%= context.resource.classNames.query %> extends GeneratedResourceQueryBase {
  constructor(
    private readonly db: <%- context.query.dbType %>,
  ) {
    super();
  }
<% if (context.query.findManyMethod) { %>

<%- context.query.findManyMethod %>
<% } %><% if (context.query.findOneMethod) { %>

<%- context.query.findOneMethod %>
<% } %><% if (context.query.resolveConditionMethod) { %>

<%- context.query.resolveConditionMethod %>
<% } %><% if (context.query.resolveOrderByMethod) { %>

<%- context.query.resolveOrderByMethod %>
<% } %>
}
