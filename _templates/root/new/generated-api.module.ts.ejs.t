---
to: <%= rootModule %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
import { Module } from '@nestjs/common';
<% for (const resource of context.resources) { %>import { <%= resource.moduleClassName %> } from './<%= resource.pluralName %>';
<% } %>
@Module({
  imports: [<%= context.resources.map((resource) => resource.moduleClassName).join(', ') %>],
  exports: [<%= context.resources.map((resource) => resource.moduleClassName).join(', ') %>],
})
export class <%= context.rootModuleClassName %> {}
