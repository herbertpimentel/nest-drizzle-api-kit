---
to: <%= rootModule %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { Module } from '@nestjs/common';
<% for (const resource of context.resources) { %>import { <%= resource.moduleClassName %> } from './<%= resource.pluralName %>';
<% } %>
@Module({
  imports: [<%= context.resources.map((resource) => resource.moduleClassName).join(', ') %>],
  exports: [<%= context.resources.map((resource) => resource.moduleClassName).join(', ') %>],
})
export class <%= context.rootModuleClassName %> {}
