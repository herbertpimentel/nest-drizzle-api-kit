---
to: <%= idParamsDto %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { ApiProperty } from '@nestjs/swagger';
<% const idField = context.resource.generatedDtos.idField; %>

export class <%= context.resource.classNames.idParamsDto %> {
<% if (idField) { %>  @ApiProperty(<%- idField.swaggerOptions.length > 0 ? `{ ${idField.swaggerOptions.join(', ')} }` : '' %>)
  <%= idField.name %>!: <%= idField.tsType %>;
<% } else { %>  @ApiProperty()
  id!: string;
<% } %>}
