const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace("await admin.firestore().collection", "await (admin as any).firestore().collection");
fs.writeFileSync('server.ts', content);
