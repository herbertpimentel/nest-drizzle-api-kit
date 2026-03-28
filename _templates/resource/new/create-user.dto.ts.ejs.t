---
to: <%= createDto %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class <%= context.resource.classNames.createDto %> {
<% for (const field of context.resource.generatedDtos.createFields) { %>
  @<%= field.optional ? 'ApiPropertyOptional' : 'ApiProperty' %>(<%- field.swaggerOptions.length > 0 || field.nullable ? `{ ${[...field.swaggerOptions, field.nullable ? 'nullable: true' : null].filter(Boolean).join(', ')} }` : '' %>)
  <%= field.name %><%= field.optional ? '?' : '!' %>: <%= field.createTsType %>;

<% } %>}
