import { db } from '../db/index.ts';
import { wallets, walletTransactions, users } from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export const generateId = (prefix: string) => `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;

export const initializeWalletForUser = async (userId: string, firebaseUid: string, role: string) => {
  return await db.transaction(async (tx) => {
    // 1. Ensure wallet exists
    let wallet = await tx.select().from(wallets).where(eq(wallets.userId, userId)).then(r => r[0]);
    if (!wallet) {
      const [newWallet] = await tx.insert(wallets).values({
        id: generateId('wal'),
        userId,
        availableBalance: 0,
        heldBalance: 0,
        currency: 'NPR'
      }).returning();
      wallet = newWallet;
    }

    // Admin should not receive welcome bidding credit unless they are normal users
    if (role === 'ADMIN') {
      return wallet;
    }

    // 2. Check for the unique welcome-bonus transaction
    const idempotencyKey = `welcome-bonus-v1-${firebaseUid}`;
    const legacyKey = `welcome-bonus-v2-${firebaseUid}`;
    
    const existingTxn = await tx.select()
      .from(walletTransactions)
      .where(sql`${walletTransactions.userId} = ${userId} AND (${walletTransactions.type} = 'WELCOME_BONUS' OR ${walletTransactions.idempotencyKey} IN (${idempotencyKey}, ${legacyKey}))`)
      .then(r => r[0]);

    if (!existingTxn) {
      // 3. Credit exactly NPR 1,000
      const bonusAmount = 1000;
      const balanceBefore = wallet.availableBalance;
      const balanceAfter = balanceBefore + bonusAmount;

      await tx.update(wallets)
        .set({ availableBalance: balanceAfter, updatedAt: new Date() })
        .where(eq(wallets.id, wallet.id));

      // Update local object
      wallet.availableBalance = balanceAfter;

      // 4. Create the wallet transaction record
      await tx.insert(walletTransactions).values({
        id: generateId('wtx'),
        walletId: wallet.id,
        userId,
        type: 'WELCOME_BONUS',
        amount: bonusAmount,
        status: 'SUCCESS',
        description: 'Rs. 1,000 Welcome Bidding Credit',
        idempotencyKey,
        balanceBefore,
        balanceAfter,
      });
    }

    return wallet;
  });
};

export const runExistingUserWalletMigration = async () => {
  let created = 0;
  let credited = 0;
  let skipped = 0;

  try {
    const normalUsers = await db.select().from(users).where(sql`${users.role} != 'ADMIN'`);
    for (const u of normalUsers) {
      const wBefore = await db.select().from(wallets).where(eq(wallets.userId, u.id)).then(r => r[0]);
      if (!wBefore) created++;
      
      const idempotencyKey = `welcome-bonus-v1-${u.uid}`;
      const legacyKey = `welcome-bonus-v2-${u.uid}`;
      const existingTxn = await db.select()
        .from(walletTransactions)
        .where(sql`${walletTransactions.userId} = ${u.id} AND (${walletTransactions.type} = 'WELCOME_BONUS' OR ${walletTransactions.idempotencyKey} IN (${idempotencyKey}, ${legacyKey}))`)
        .then(r => r[0]);

      if (!existingTxn) {
        await initializeWalletForUser(u.id, u.uid, u.role);
        credited++;
      } else {
        skipped++;
      }
    }
    console.log(`[WALLET MIGRATION SUMMARY] Created: ${created}, Credited: ${credited}, Skipped: ${skipped}`);
    return { created, credited, skipped };
  } catch (err) {
    console.error('Migration error:', err);
    throw err;
  }
};

