<%
const fs = require('node:fs');
const path = require('node:path');
const context = JSON.parse(fs.readFileSync(locals.contextFile, 'utf8'));
%>
