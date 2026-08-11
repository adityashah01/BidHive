import * as dotenv from 'dotenv';
dotenv.config();

import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';
import { initializeWalletForUser } from '../src/services/wallet.ts';
import { eq } from 'drizzle-orm';

async function runMigration() {
  console.log('Starting Wallet Migration...');
  
  const allUsers = await db.select().from(users);
  console.log(`Found ${allUsers.length} total users.`);
  
  let created = 0;
  let credited = 0;
  let skipped = 0;
  
  for (const user of allUsers) {
    if (user.role === 'ADMIN') {
      skipped++;
      continue;
    }
    
    try {
      // The initializeWalletForUser function is designed to be idempotent
      const wallet = await initializeWalletForUser(user.id, user.uid, user.role);
      
      // Since initializeWalletForUser doesn't explicitly return whether it created a wallet or credited,
      // we just know it succeeded. If we wanted exact counts, we'd need to inspect the db before/after,
      // but for simplicity we just say processed.
      console.log(`Processed wallet for user: ${user.name} (${user.email})`);
      credited++;
    } catch (e: any) {
      console.error(`Failed to process wallet for user ${user.email}:`, e.message);
    }
  }
  
  console.log('--- Migration Summary ---');
  console.log(`Total users processed (credited/created or already had bonus): ${credited}`);
  console.log(`Total users skipped (ADMIN): ${skipped}`);
  console.log('Migration complete.');
  process.exit(0);
}

runMigration().catch(console.error);
