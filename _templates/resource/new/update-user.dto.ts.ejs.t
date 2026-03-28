---
to: <%= updateDto %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
import { PartialType } from '@nestjs/swagger';
import { <%= context.resource.classNames.createDto %> } from './<%= context.resource.fileNames.createDto.replace('.ts', '') %>';

export class <%= context.resource.classNames.updateDto %> extends PartialType(<%= context.resource.classNames.createDto %>) {
}
