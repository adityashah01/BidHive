const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace("if (!admin.apps.length)", "if (!(admin as any).apps.length)");
content = content.replace("firestoreInstance = admin.firestore()", "firestoreInstance = (admin as any).firestore()");
content = content.replace("await admin.firestore().collection", "await (admin as any).firestore().collection");
fs.writeFileSync('server.ts', content);
