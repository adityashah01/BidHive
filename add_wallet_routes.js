const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const walletRoutes = `
  // Wallet Routes
  app.get('/api/wallet/:userId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { userId } = req.params;
      
      // Basic check
      if (req.dbUser.id !== userId && req.dbUser.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      let wallet = await db.select().from(wallets).where(eq(wallets.userId, userId)).then(r => r[0]);
      if (!wallet) {
        const [newWallet] = await db.insert(wallets).values({
          id: generateId('wal'),
          userId: userId,
          balance: 0,
          lockedBalance: 0
        }).returning();
        wallet = newWallet;
      }

      const recentTxns = await db.select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, userId))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(20);

      const topups = await db.select()
        .from(walletTopups)
        .where(eq(walletTopups.userId, userId))
        .orderBy(desc(walletTopups.createdAt));

      res.json({ wallet, transactions: recentTxns, topups });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch wallet: ' + error.message });
    }
  });

  app.post('/api/wallet/topup', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { amount, paymentMethod, transactionId, screenshotUrl } = req.body;
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const [topup] = await db.insert(walletTopups).values({
        id: generateId('wtp'),
        userId: req.dbUser.id,
        amount: amountNum,
        paymentMethod,
        transactionId,
        screenshotUrl,
        status: 'PENDING'
      }).returning();

      res.json(topup);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create topup request: ' + error.message });
    }
  });

  app.get('/api/admin/wallet-topups', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      // Need a join to get user details
      const result = await db.execute(sql\`
        SELECT wt.*, u.name as user_name, u.email as user_email
        FROM wallet_topups wt
        JOIN users u ON wt.user_id = u.id
        ORDER BY wt.created_at DESC
      \`);
      res.json(result.rows || result); // Handling both postgres and neon responses
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch topups: ' + error.message });
    }
  });

  app.post('/api/admin/wallet-topups/:topupId/approve', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const { topupId } = req.params;
      
      const result = await db.transaction(async (tx) => {
        const topup = await tx.select().from(walletTopups).where(eq(walletTopups.id, topupId)).then(r => r[0]);
        if (!topup) throw new Error('Topup request not found');
        if (topup.status !== 'PENDING') throw new Error('Topup is not pending');

        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, topup.userId)).then(r => r[0]);
        if (!wallet) {
          const [newWallet] = await tx.insert(wallets).values({
            id: generateId('wal'),
            userId: topup.userId,
            balance: 0,
            lockedBalance: 0
          }).returning();
          wallet = newWallet;
        }

        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + topup.amount;

        // Update wallet
        await tx.update(wallets)
          .set({ balance: balanceAfter, updatedAt: new Date() })
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
          userId: topup.userId,
          type: 'TOPUP',
          amount: topup.amount,
          balanceBefore,
          balanceAfter,
          referenceType: 'wallet_topups',
          referenceId: topup.id,
          description: \`Wallet topped up via \${topup.paymentMethod}\`
        });

        // Add Notification
        await tx.insert(notifications).values({
          id: generateId('not'),
          userId: topup.userId,
          type: 'PAYMENT_RECEIVED',
          message: \`Your wallet top-up of Rs. \${topup.amount} has been approved.\`,
          link: '/dashboard',
          isRead: false
        });

        return updatedTopup;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to approve topup: ' + error.message });
    }
  });

  app.post('/api/admin/wallet-topups/:topupId/reject', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    try {
      const { topupId } = req.params;
      const { adminNote } = req.body;
      
      const [updatedTopup] = await db.update(walletTopups)
        .set({ 
          status: 'REJECTED', 
          adminNote: adminNote || 'Rejected by admin',
          approvedBy: req.dbUser.id, 
          approvedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(walletTopups.id, topupId))
        .returning();

      // Add Notification
      await db.insert(notifications).values({
        id: generateId('not'),
        userId: updatedTopup.userId,
        type: 'PAYMENT_RECEIVED',
        message: \`Your wallet top-up of Rs. \${updatedTopup.amount} was rejected. Note: \${adminNote}\`,
        link: '/dashboard',
        isRead: false
      });

      res.json(updatedTopup);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to reject topup: ' + error.message });
    }
  });
`;

code = code.replace("  // 10. Get User Transactions", walletRoutes + "\n  // 10. Get User Transactions");
fs.writeFileSync('server.ts', code);
console.log('Added wallet routes');
