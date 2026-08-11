import { createPool } from './index.ts';

async function runMigration() {
  console.log('[Migration] Starting DB Schema Migration...');
  const pool = createPool();

  try {
    // 1. Add missing columns to notifications table
    console.log('[Migration] Updating notifications table...');
    await pool.query(`
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS title text,
      ADD COLUMN IF NOT EXISTS listing_id text,
      ADD COLUMN IF NOT EXISTS transaction_id text,
      ADD COLUMN IF NOT EXISTS deduplication_key text UNIQUE;
    `);

    // 2. Create email_outbox table
    console.log('[Migration] Creating email_outbox table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_outbox (
        id text PRIMARY KEY,
        user_id text REFERENCES users(id),
        recipient_email text NOT NULL,
        email_type text NOT NULL,
        listing_id text REFERENCES listings(id) ON DELETE SET NULL,
        subject text NOT NULL,
        html_content text NOT NULL,
        text_content text NOT NULL,
        deduplication_key text UNIQUE NOT NULL,
        status text DEFAULT 'PENDING' NOT NULL,
        attempts integer DEFAULT 0 NOT NULL,
        last_error text,
        next_attempt_at timestamp DEFAULT now() NOT NULL,
        provider_message_id text,
        created_at timestamp DEFAULT now() NOT NULL,
        sent_at timestamp
      );
    `);

    console.log('[Migration] DB Schema Migration completed successfully!');
  } catch (err) {
    console.error('[Migration Error]:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
