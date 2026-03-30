---
to: <%= service %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
<%- context.render.service.tableImport %>

<%- context.render.service.commonDbImport %>
<% if (context.render.service.paginationImport) { %><%- context.render.service.paginationImport %>
<% } %>
<% if (context.render.service.validationImport) { %><%- context.render.service.validationImport %>
<% } %>
<% if (context.render.service.hooksImport) { %><%- context.render.service.hooksImport %>
<% } %>
import { <%= context.resource.classNames.findQueryDto %> } from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.createDto %> } from './dto/<%= context.resource.fileNames.createDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.updateDto %> } from './dto/<%= context.resource.fileNames.updateDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.responseDto %> } from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';
import { <%= context.resource.classNames.query %> } from './<%= context.resource.fileNames.query.replace('.ts', '') %>';


<% if (context.render.service.validationSchemaDeclarations) { %><%- context.render.service.validationSchemaDeclarations %>
<% } %>
@Injectable()
export class <%= context.resource.classNames.service %> {
  constructor(
    @Inject(DB_PROVIDER_TOKEN)
    private readonly db: <%- context.render.service.dbType %>,
  ) {}

<%- context.render.service.findMethod %>

<%- context.render.service.findOneMethod %>

<%- context.render.service.createMethod %>

<%- context.render.service.updateMethod %>

<%- context.render.service.deleteMethod %>
}
