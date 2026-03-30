---
to: <%= metadata %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
export const <%= context.resource.classNames.resourceMetadata %> = {
  name: <%- JSON.stringify(context.resource.name) %>,
  basePath: <%- JSON.stringify(context.resource.basePath) %>,
  docs: {
    enabled: <%= context.resource.docs.enabled %>,
    tags: <%- JSON.stringify(context.resource.docs.tags ?? []) %>,
<% if (context.resource.docs.description) { %>    description: <%- JSON.stringify(context.resource.docs.description) %>,
<% } %>  },
  operationIds: {
<% for (const functionName of ['find', 'findOne', 'create', 'update', 'delete']) { %>    <%= functionName %>: <%- JSON.stringify(context.resource.functions[functionName].operationId) %>,
<% } %>  },
} as const;
