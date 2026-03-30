---
to: <%= commonTypes %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
};
