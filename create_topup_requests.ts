import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS topup_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        wallet_id TEXT NOT NULL REFERENCES wallets(id),
        requested_amount DOUBLE PRECISION NOT NULL,
        approved_amount DOUBLE PRECISION,
        currency TEXT NOT NULL DEFAULT 'NPR',
        payment_method TEXT NOT NULL,
        payment_reference TEXT,
        payment_screenshot_url TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        submitted_at TIMESTAMP NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMP,
        reviewed_by TEXT REFERENCES users(id),
        admin_note TEXT,
        rejection_reason TEXT,
        wallet_transaction_id TEXT,
        idempotency_key TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('Created topup_requests table');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await pool.end();
  }
}
run();
