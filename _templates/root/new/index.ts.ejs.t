---
to: <%= index %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
export * from './<%= context.rootModuleFileName.replace('.ts', '') %>';
export * from './common';
<% for (const resource of context.resources) { %>export * from './<%= resource.pluralName %>';
<% } %>
