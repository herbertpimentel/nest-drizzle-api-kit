---
to: <%= module %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
import { Module } from '@nestjs/common';
import { <%= context.resource.classNames.controller %> } from './<%= context.resource.fileNames.controller.replace('.ts', '') %>';
import { <%= context.resource.classNames.service %> } from './<%= context.resource.fileNames.service.replace('.ts', '') %>';

@Module({
  controllers: [<%= context.resource.classNames.controller %>],
  providers: [<%= context.resource.classNames.service %>],
  exports: [<%= context.resource.classNames.service %>],
})
export class <%= context.resource.classNames.module %> {}
