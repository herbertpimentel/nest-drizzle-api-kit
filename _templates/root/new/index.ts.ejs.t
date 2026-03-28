---
to: <%= index %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
export * from './<%= context.rootModuleFileName.replace('.ts', '') %>';
export * from './common';
<% for (const resource of context.resources) { %>export * from './<%= resource.pluralName %>';
<% } %>
