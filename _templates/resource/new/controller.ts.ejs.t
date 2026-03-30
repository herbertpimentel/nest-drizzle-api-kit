---
to: <%= controller %>
---
<% const context = JSON.parse(contextJson); const r = context.resource; const controller = context.controller; %><%= context.generatedHeader %>
import { <%= controller.commonImports.join(', ') %> } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
<% if (context.render.controller.guardImport) { %><%- context.render.controller.guardImport %>
<% } %>import { <%= r.classNames.service %> } from './<%= r.fileNames.service.replace('.ts', '') %>';
import { <%= r.classNames.findQueryDto %> } from './dto/<%= r.fileNames.findQueryDto.replace('.ts', '') %>';
import { <%= r.classNames.createDto %> } from './dto/<%= r.fileNames.createDto.replace('.ts', '') %>';
import { <%= r.classNames.updateDto %> } from './dto/<%= r.fileNames.updateDto.replace('.ts', '') %>';
<% if (controller.usesIdParamsDtoImport) { %>import { <%= r.classNames.idParamsDto %> } from './dto/<%= r.fileNames.idParamsDto.replace('.ts', '') %>';
<% } %>

@ApiTags('<%= r.openApiTag %>')
@Controller('<%= r.routeBasePath %>')
<% if (controller.guardDecorator) { %><%= controller.guardDecorator %>
<% } %>export class <%= r.classNames.controller %> {
  constructor(private readonly service: <%= r.classNames.service %>) {}
<% if (context.render.controller.bigIntParserMethod) { %>

<%- context.render.controller.bigIntParserMethod %>
<% } %>
<% if (context.render.controller.methods) { %>
<%- context.render.controller.methods %>
<% } %>

}
