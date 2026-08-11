import fs from 'fs';
let content = fs.readFileSync('src/services/wallet.ts', 'utf-8');
content = content.replace("import { v4 as uuidv4 } from 'uuid';", "import crypto from 'crypto';");
content = content.replace("uuidv4()", "crypto.randomUUID()");
fs.writeFileSync('src/services/wallet.ts', content);
