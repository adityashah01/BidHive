const { Client } = require('pg');
require('dotenv').config();

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();

  try {
    console.log('Creating wallets table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "wallets" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "available_balance" double precision DEFAULT 0 NOT NULL,
        "held_balance" double precision DEFAULT 0 NOT NULL,
        "currency" text DEFAULT 'NPR' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "wallets_user_id_unique" UNIQUE("user_id")
      );
    `);
    
    console.log('Creating wallet_topups...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "wallet_topups" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "amount" double precision NOT NULL,
        "payment_method" text NOT NULL,
        "transaction_id" text,
        "screenshot_url" text,
        "status" text DEFAULT 'PENDING' NOT NULL,
        "admin_note" text,
        "approved_by" text,
        "approved_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    
    console.log('Altering wallet_transactions...');
    await client.query('DROP TABLE IF EXISTS "wallet_transactions";');
    await client.query(`
      CREATE TABLE "wallet_transactions" (
        "id" text PRIMARY KEY NOT NULL,
        "wallet_id" text NOT NULL,
        "user_id" text NOT NULL,
        "type" text NOT NULL,
        "amount" double precision NOT NULL,
        "status" text DEFAULT 'SUCCESS' NOT NULL,
        "description" text NOT NULL,
        "reference_type" text,
        "reference_id" text,
        "idempotency_key" text,
        "balance_before" double precision NOT NULL,
        "balance_after" double precision NOT NULL,
        "metadata" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "wallet_transactions_idempotency_key_unique" UNIQUE("idempotency_key")
      );
    `);
    
    console.log('Creating wallet_holds...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "wallet_holds" (
        "id" text PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "wallet_id" text NOT NULL,
        "listing_id" text NOT NULL,
        "bid_id" text,
        "amount" double precision NOT NULL,
        "status" text DEFAULT 'ACTIVE' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
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
