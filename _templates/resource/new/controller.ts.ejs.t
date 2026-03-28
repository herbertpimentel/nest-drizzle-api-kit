---
to: <%= controller %>
---
<%
const context = JSON.parse(contextJson);
const r = context.resource;
const controller = context.controller;
const summary = (endpoint, fallback) => r.openApi.summaryByEndpoint && r.openApi.summaryByEndpoint[endpoint] ? r.openApi.summaryByEndpoint[endpoint] : fallback;
%><%= context.generatedHeader %>
import { <%= controller.commonImports.join(', ') %> } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
<% if (controller.hasGuardImport) { %>import { <%= context.guards.names.join(', ') %> } from '<%= context.guards.importPath %>';
<% } %>import { <%= r.classNames.service %> } from './<%= r.fileNames.service.replace('.ts', '') %>';
import { <%= r.classNames.findQueryDto %> } from './dto/<%= r.fileNames.findQueryDto.replace('.ts', '') %>';
import { <%= r.classNames.createDto %> } from './dto/<%= r.fileNames.createDto.replace('.ts', '') %>';
import { <%= r.classNames.updateDto %> } from './dto/<%= r.fileNames.updateDto.replace('.ts', '') %>';
<% if (controller.usesIdParamsDtoImport) { %>
import { <%= r.classNames.idParamsDto %> } from './dto/<%= r.fileNames.idParamsDto.replace('.ts', '') %>';
<% } %>

@ApiTags('<%= r.openApiTag %>')
@Controller('<%= r.routeBasePath %>')
<% if (controller.guardDecorator) { %><%= controller.guardDecorator %>
<% } %>export class <%= r.classNames.controller %> {
  constructor(private readonly service: <%= r.classNames.service %>) {}
<% if (controller.usesBigIntIdParser) { %>

  private parseBigIntId(value: string): bigint {
    try {
      return BigInt(value);
    } catch {
      throw new BadRequestException('Validation failed (numeric string is expected)');
    }
  }
<% } %>
<% if (r.endpoints.find.enabled) { %>
  @Get()
  @ApiOperation({ operationId: '<%= r.endpoints.find.operationId %>', summary: '<%= summary('find', `Find ${r.pluralName}`) %>' })
  async find(@Query() query: <%= r.classNames.findQueryDto %>) {
    return this.service.find(query);
  }
<% } %>
<% if (r.endpoints.findOne.enabled) { %>
  @Get(':id')
  @ApiOperation({ operationId: '<%= r.endpoints.findOne.operationId %>', summary: '<%= summary('findOne', `Find ${r.singularName}`) %>' })
<% if (controller.usesNumberIdPipe) { %>  async findOne(@Param('id', ParseIntPipe) id: number, @Query() query: <%= r.classNames.findQueryDto %>) {
    return this.service.findOne(id, query);
<% } else if (controller.usesBigIntIdParser) { %>  async findOne(@Param('id') id: string, @Query() query: <%= r.classNames.findQueryDto %>) {
    return this.service.findOne(this.parseBigIntId(id), query);
<% } else { %>  async findOne(@Param() params: <%= r.classNames.idParamsDto %>, @Query() query: <%= r.classNames.findQueryDto %>) {
    return this.service.findOne(params.id, query);
<% } %>
  }
<% } %>
<% if (r.endpoints.create.enabled) { %>
  @Post()
  @ApiOperation({ operationId: '<%= r.endpoints.create.operationId %>', summary: '<%= summary('create', `Create ${r.singularName}`) %>' })
  async create(@Body() body: <%= r.classNames.createDto %>) {
    return this.service.create(body);
  }
<% } %>
<% if (r.endpoints.update.enabled) { %>
  @Patch(':id')
  @ApiOperation({ operationId: '<%= r.endpoints.update.operationId %>', summary: '<%= summary('update', `Update ${r.singularName}`) %>' })
<% if (controller.usesNumberIdPipe) { %>  async update(@Param('id', ParseIntPipe) id: number, @Body() body: <%= r.classNames.updateDto %>) {
    return this.service.update(id, body);
<% } else if (controller.usesBigIntIdParser) { %>  async update(@Param('id') id: string, @Body() body: <%= r.classNames.updateDto %>) {
    return this.service.update(this.parseBigIntId(id), body);
<% } else { %>  async update(@Param() params: <%= r.classNames.idParamsDto %>, @Body() body: <%= r.classNames.updateDto %>) {
    return this.service.update(params.id, body);
<% } %>
  }
<% } %>
<% if (r.endpoints.delete.enabled) { %>
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ operationId: '<%= r.endpoints.delete.operationId %>', summary: '<%= summary('delete', `Delete ${r.singularName}`) %>' })
<% if (controller.usesNumberIdPipe) { %>  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.service.delete(id);
<% } else if (controller.usesBigIntIdParser) { %>  async delete(@Param('id') id: string) {
    await this.service.delete(this.parseBigIntId(id));
<% } else { %>  async delete(@Param() params: <%= r.classNames.idParamsDto %>) {
    await this.service.delete(params.id);
<% } %>
  }
<% } %>
}
