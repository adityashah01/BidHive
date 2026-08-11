import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// Remove old wallet-topups routes
content = content.replace(/app\.post\('\/api\/wallet\/topup'.*?\}\);/s, '');
content = content.replace(/app\.get\('\/api\/admin\/wallet-topups'.*?\}\);/s, '');
content = content.replace(/app\.post\('\/api\/admin\/wallet-topups\/:topupId\/approve'.*?\}\);/s, '');
content = content.replace(/app\.post\('\/api\/admin\/wallet-topups\/:topupId\/reject'.*?\}\);/s, '');

// Also make sure to replace walletTopups with topupRequests in imports if not already done, but we'll do it later.

fs.writeFileSync('server.ts', content);
console.log('Removed old topup routes.');
