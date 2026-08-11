import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');
if (!server.includes("import crypto from 'crypto';")) {
  server = "import crypto from 'crypto';\n" + server;
}
fs.writeFileSync('server.ts', server);
