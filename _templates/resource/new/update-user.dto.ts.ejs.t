---
to: <%= updateInputDto %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
const definition = context.dto.updateInput;
%><% if (definition) { %><%= context.generatedHeader %>
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class <%= definition.className %> {
<% for (const field of definition.fields ?? []) { %>
  @<%= field.optional ? 'ApiPropertyOptional' : 'ApiProperty' %>(<%- field.swaggerOptions.length > 0 || field.nullable ? `{ ${[...field.swaggerOptions, field.nullable ? 'nullable: true' : null].filter(Boolean).join(', ')} }` : '' %>)
  <%= field.name %><%= field.optional ? '?' : '!' %>: <%= field.createTsType %>;

<% } %>}
<% } %>
