const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('initializeWalletForUser')) {
  code = code.replace(
    "import { seedDatabase } from './src/db/seed.ts';",
    "import { seedDatabase } from './src/db/seed.ts';\nimport { initializeWalletForUser } from './src/services/wallet.ts';"
  );
  
  // in app.get('/api/auth/me' ... 
  code = code.replace(
    "res.json(req.dbUser);",
    "await initializeWalletForUser(req.dbUser.id, req.dbUser.uid, req.dbUser.role);\n      res.json(req.dbUser);"
  );
  
  // in app.get('/api/wallet/:userId' ...
  // Wait, let's just rewrite the /api/wallet endpoint completely.
}
fs.writeFileSync('server.ts', code);
