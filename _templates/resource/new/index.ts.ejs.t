---
to: <%= index %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
export * from './<%= context.resource.fileNames.module.replace('.ts', '') %>';
export * from './<%= context.resource.fileNames.controller.replace('.ts', '') %>';
export * from './<%= context.resource.fileNames.service.replace('.ts', '') %>';
export * from './<%= context.resource.fileNames.query.replace('.ts', '') %>';
export * from './dto/<%= context.resource.fileNames.createDto.replace('.ts', '') %>';
export * from './dto/<%= context.resource.fileNames.updateDto.replace('.ts', '') %>';
export * from './dto/<%= context.resource.fileNames.findQueryDto.replace('.ts', '') %>';
export * from './dto/<%= context.resource.fileNames.idParamsDto.replace('.ts', '') %>';
export * from './dto/<%= context.resource.fileNames.responseDto.replace('.ts', '') %>';
