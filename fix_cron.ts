import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');

if (!server.includes("import cron from 'node-cron';")) {
  server = "import cron from 'node-cron';\n" + server;
}

const cronCode = `
  // Start the background cron job to conclude expired auctions every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Checking for expired auctions...');
    await concludeExpiredAuctions();
  });

  app.listen(PORT, '0.0.0.0', () => {`;

if (!server.includes('cron.schedule')) {
  server = server.replace("app.listen(PORT, '0.0.0.0', () => {", cronCode);
}

fs.writeFileSync('server.ts', server);
