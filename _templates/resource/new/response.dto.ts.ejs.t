---
to: <%= responseDto %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { ApiProperty } from '@nestjs/swagger';

export class <%= context.resource.classNames.responseDto %> {
<% for (const field of context.resource.generatedDtos.responseFields) { %>
  @ApiProperty(<%- field.swaggerOptions.length > 0 || field.nullable ? `{ ${[...field.swaggerOptions, field.nullable ? 'nullable: true' : null].filter(Boolean).join(', ')} }` : '' %>)
  <%= field.name %>!: <%= field.responseTsType %>;

<% } %>}
