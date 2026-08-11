const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add walletHolds to imports
code = code.replace(
  'walletTopups, walletTransactions }',
  'walletTopups, walletTransactions, walletHolds }'
);

// Fix pusher in app.post('/api/listings/:id/bid')
code = code.replace(
  "pusher.trigger(\`listing-\${id}\`, 'new-bid', result);",
  "const pusherClient = getPusher();\n      if (pusherClient) pusherClient.trigger(\`listing-\${id}\`, 'new-bid', result);"
);

// Fix typeFilter cast
code = code.replace(
  'conditions.push(eq(walletTransactions.type, typeFilter));',
  'conditions.push(eq(walletTransactions.type, typeFilter as any));'
);

fs.writeFileSync('server.ts', code);
