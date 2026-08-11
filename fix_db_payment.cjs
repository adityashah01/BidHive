const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log('Creating payment_screenshots...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "payment_screenshots" (
        "id" text PRIMARY KEY NOT NULL,
        "transaction_id" text NOT NULL,
        "buyer_id" text NOT NULL,
        "buyer_name" text NOT NULL,
        "buyer_email" text NOT NULL,
        "amount" double precision NOT NULL,
        "screenshot_url" text NOT NULL,
        "payment_method" text DEFAULT 'QR_CODE' NOT NULL,
        "status" text DEFAULT 'PENDING_REVIEW' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('Done!');
  } catch(e) {
    console.error('Migration error:', e);
  } finally {
    await client.end();
  }
}

run();
