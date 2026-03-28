---
to: <%= commonTypes %>
---
<% const context = JSON.parse(contextJson); %><%= context.generatedHeader %>

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
