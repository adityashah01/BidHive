import fs from 'fs';

// 1. Fix schema.ts
let schema = fs.readFileSync('src/db/schema.ts', 'utf-8');
if (!schema.includes('import { customType }')) {
  schema = schema.replace("import { pgTable, text, timestamp, boolean, integer, json, primaryKey } from 'drizzle-orm/pg-core';", "import { pgTable, text, timestamp, boolean, integer, json, primaryKey, customType } from 'drizzle-orm/pg-core';");
}
fs.writeFileSync('src/db/schema.ts', schema);

// 2. Fix server.ts
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(/import crypto from 'crypto';\n  const generateId =/g, "const generateId =");
server = server.replace(/let safeBody = e.body;/g, "let safeBody = e.bodyHtml;");
server = server.replace(/\{ \.\.\.e, body: safeBody \}/g, "{ ...e, bodyHtml: safeBody }");
fs.writeFileSync('server.ts', server);

