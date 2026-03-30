---
to: <%= index %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
<% for (const exportLine of context.indexExports) { %><%- exportLine %>
<% } %>
