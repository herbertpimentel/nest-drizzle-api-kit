---
to: <%= metadata %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>
export const <%= context.resource.classNames.resourceMetadata %> = {
  name: '<%= context.resource.name %>',
  routeBasePath: '<%= context.resource.routeBasePath %>',
  operationIds: {
    find: '<%= context.resource.endpoints.find.operationId %>',
    findOne: '<%= context.resource.endpoints.findOne.operationId %>',
    create: '<%= context.resource.endpoints.create.operationId %>',
    update: '<%= context.resource.endpoints.update.operationId %>',
    delete: '<%= context.resource.endpoints.delete.operationId %>',
  },
  baseQuery: undefined,
} as const;
