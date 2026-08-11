const { Client } = require('pg');
require('dotenv').config();
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log(res.rows.map(r => r.tablename));
  } finally {
    await client.end();
  }
}
run();
