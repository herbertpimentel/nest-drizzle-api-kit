---
to: <%= commonIndex %>
---
<%
const fs = process.getBuiltinModule('fs');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%><%= context.generatedHeader %>
export * from './db';
export * from './types';
export * from './query';
export * from './validation';
