const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    
    console.log('Updating all ACTIVE listings to end in 7 days...');
    await client.query('UPDATE "listings" SET "end_time" = $1, "status" = \'ACTIVE\'', [futureDate]);
    
    console.log('Auctions are now live.');
  } catch(e) {
    console.error('Migration error:', e);
  } finally {
    await client.end();
  }
}

run();
