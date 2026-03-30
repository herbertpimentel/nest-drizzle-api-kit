---
to: <%= commonDb %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
<% const schemaSourceAlias = '__apiKitSchemaSource'; %><% if (context.dbSchemaImportKind === 'default') { %>import <%= schemaSourceAlias %> from '<%= context.dbSchemaImportPath %>';
<% } else if (context.dbSchemaImportKind === 'namespace') { %>import * as <%= schemaSourceAlias %> from '<%= context.dbSchemaImportPath %>';
<% } else if (context.dbSchemaImportSourceName) { %>import { <%= context.dbSchemaImportSourceName %> as <%= schemaSourceAlias %> } from '<%= context.dbSchemaImportPath %>';
<% } %>
export const DB_PROVIDER_TOKEN = '<%= context.dbProviderToken %>';

<% if (context.dbSchemaAccessExpression) { %>export const schema = <%= context.dbSchemaAccessExpression.replace(new RegExp(`^${context.dbSchemaImportName}(?=\\.|$)`), schemaSourceAlias) %>;
<% } %>
