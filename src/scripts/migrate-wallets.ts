import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { runExistingUserWalletMigration } from '../services/wallet.ts';

async function main() {
  console.log('Starting existing user wallet migration script...');
  const result = await runExistingUserWalletMigration();
  console.log('Migration finished:', result);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
