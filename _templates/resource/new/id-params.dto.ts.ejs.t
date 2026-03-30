---
to: <%= idParamsDto %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
const definition = context.dto.idParams;
const idField = context.resource.generatedDtos.idField;
%><% if (definition) { %><%= context.generatedHeader %>
import { ApiProperty } from '@nestjs/swagger';
<% if (idField?.tsType === 'number') { %>import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
<% } else if (idField?.tsType === 'bigint') { %>import { Transform } from 'class-transformer';
<% } %>

export class <%= definition.className %> {
  @ApiProperty(<%- idField?.swaggerOptions?.length ? `{ ${idField.swaggerOptions.join(', ')} }` : '' %>)
<% if (idField?.tsType === 'number') { %>  @Type(() => Number)
  @IsInt()
<% } else if (idField?.tsType === 'bigint') { %>  @Transform(({ value }) => (typeof value === 'bigint' ? value : BigInt(value)))
<% } %>  <%= idField?.name ?? 'id' %>!: <%= idField?.tsType ?? 'string' %>;
}
<% } %>
