import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: true });
async function run() {
  try {
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS deleted_by TEXT');
    await pool.query('ALTER TABLE listings ADD COLUMN IF NOT EXISTS deletion_reason TEXT');
    console.log('Columns added');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
run();
