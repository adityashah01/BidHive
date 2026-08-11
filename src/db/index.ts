import dotenv from 'dotenv';
import path from 'path';

// Load .env.local first (development override), then default .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from './schema.ts';

// Function to create a new connection pool.
export const createPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (connectionString) {
    // Neon PostgreSQL requires SSL connections
    return new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
      connectionTimeoutMillis: 15000,
    });
  }

  // Fallback to local SQL environment variables provided by AI Studio dev environment
  const sqlHost = process.env.SQL_HOST;
  const sqlUser = process.env.SQL_USER;
  const sqlPassword = process.env.SQL_PASSWORD;
  const sqlDbName = process.env.SQL_DB_NAME;

  if (sqlHost && sqlUser && sqlDbName) {
    console.log("[DB] DATABASE_URL is missing. Falling back to development SQL environment variables.");
    return new Pool({
      host: sqlHost,
      user: sqlUser,
      password: sqlPassword,
      database: sqlDbName,
      connectionTimeoutMillis: 15000,
    });
  }

  console.warn("⚠️ Neither DATABASE_URL nor local SQL environment variables are configured. Queries will fail.");
  return new Pool({
    connectionTimeoutMillis: 5000,
  });
};

// Create a pool instance.
const pool = createPool();

// Prevent unhandled pool-level errors from crashing the application
pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });
export { schema };
