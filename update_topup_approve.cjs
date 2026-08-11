const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /let wallet = await tx\.select\(\)\.from\(wallets\)[\s\S]*?(?=await tx\.insert\(notifications\))/;

const newLogic = `let wallet = await tx.select().from(wallets).where(eq(wallets.userId, topup.userId)).then(r => r[0]);
        if (!wallet) {
          const [newWallet] = await tx.insert(wallets).values({
            id: generateId('wal'),
            userId: topup.userId,
            availableBalance: 0,
            heldBalance: 0
          }).returning();
          wallet = newWallet;
        }

        const balanceBefore = wallet.availableBalance;
        const balanceAfter = balanceBefore + topup.amount;

        // Update wallet
        await tx.update(wallets)
          .set({ availableBalance: balanceAfter, updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        // Update topup
        const [updatedTopup] = await tx.update(walletTopups)
          .set({ 
            status: 'APPROVED', 
            approvedBy: req.dbUser.id, 
            approvedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(walletTopups.id, topup.id))
          .returning();

        // Create wallet transaction
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'),
          walletId: wallet.id,
          userId: topup.userId,
          type: 'TOP_UP',
          amount: topup.amount,
          status: 'SUCCESS',
          balanceBefore,
          balanceAfter,
          referenceType: 'wallet_topups',
          referenceId: topup.id,
          description: \`Wallet top-up approved via \${topup.paymentMethod}\`
        });

        `;

code = code.replace(regex, newLogic);
fs.writeFileSync('server.ts', code);
