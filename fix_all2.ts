import fs from 'fs';

// 1. schema.ts
let schema = fs.readFileSync('src/db/schema.ts', 'utf-8');
if (!schema.includes('import { customType }')) {
  schema = "import { customType } from 'drizzle-orm/pg-core';\n" + schema;
}
fs.writeFileSync('src/db/schema.ts', schema);

// 2. server.ts crypto
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(/import crypto from 'crypto';/g, "import * as nodeCrypto from 'crypto';");
server = server.replace(/crypto\.randomInt/g, "nodeCrypto.randomInt");
server = server.replace(/crypto\.randomUUID/g, "nodeCrypto.randomUUID");
server = server.replace(/crypto\.randomBytes/g, "nodeCrypto.randomBytes");
server = server.replace(/crypto\.createHash/g, "nodeCrypto.createHash");

// Also there might be a crypto.randomUUID() that doesn't conflict, but randomInt does because DOM Crypto doesn't have it.
fs.writeFileSync('server.ts', server);
