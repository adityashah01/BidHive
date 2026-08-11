import { db } from './src/db';
import { listings } from './src/db/schema';
async function run() {
  try {
    const data = await db.select().from(listings).limit(1);
    console.log('Query successful, found listings:', data.length);
    process.exit(0);
  } catch (err) {
    console.error('Error querying DB:', err);
    process.exit(1);
  }
}
run();
