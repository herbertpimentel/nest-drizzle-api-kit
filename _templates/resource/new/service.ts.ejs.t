---
to: <%= service %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<%- context.service.importsBlock %>

@Injectable()
export class <%= context.resource.classNames.service %> {
  constructor(
    @Inject(DB_PROVIDER_TOKEN)
    private readonly db: <%- context.service.dbType %>,
  ) {}
<% if (context.service.findMethod) { %>

<%- context.service.findMethod %>
<% } %><% if (context.service.findOneMethod) { %>

<%- context.service.findOneMethod %>
<% } %><% if (context.service.createMethod) { %>

<%- context.service.createMethod %>
<% } %><% if (context.service.updateMethod) { %>

<%- context.service.updateMethod %>
<% } %><% if (context.service.deleteMethod) { %>

<%- context.service.deleteMethod %>
<% } %>
}
