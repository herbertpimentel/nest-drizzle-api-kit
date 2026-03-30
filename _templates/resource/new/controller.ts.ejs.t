---
to: <%= controller %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
<%- context.controller.importsBlock %>

<% if (context.controller.apiTagsDecorator) { %><%- context.controller.apiTagsDecorator %>
<% } %>@Controller('<%= context.resource.basePath %>')
<% if (context.controller.guardDecorator) { %><%- context.controller.guardDecorator %>
<% } %>export class <%= context.resource.classNames.controller %> {
  constructor(private readonly service: <%= context.resource.classNames.service %>) {}
<% if (context.controller.bigIntParserMethod) { %>

<%- context.controller.bigIntParserMethod %>
<% } %><% if (context.controller.methods) { %>

<%- context.controller.methods %>
<% } %>
}
