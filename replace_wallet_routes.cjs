const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Replace GET /api/wallet/:userId
const oldWalletGet = `  app.get('/api/wallet/:userId', requireAuth, async (req: AuthRequest, res) => {
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
  });`;

const newWalletRoutes = `  app.get('/api/wallet', requireAuth, async (req: AuthRequest, res) => {
    try {
      // Re-initialize to ensure it exists
      const wallet = await initializeWalletForUser(req.dbUser.id, req.dbUser.uid, req.dbUser.role);
      
      const welcomeBonusTxn = await db.select().from(walletTransactions)
        .where(and(eq(walletTransactions.userId, req.dbUser.id), eq(walletTransactions.type, 'WELCOME_BONUS')))
        .limit(1).then(r => r[0]);
        
      res.json({
        success: true,
        wallet: {
          availableBalance: wallet.availableBalance,
          heldBalance: wallet.heldBalance,
          totalBalance: wallet.availableBalance + wallet.heldBalance,
          currency: wallet.currency,
          welcomeBonusReceived: !!welcomeBonusTxn
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch wallet: ' + error.message });
    }
  });

  app.get('/api/wallet/transactions', requireAuth, async (req: AuthRequest, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const typeFilter = req.query.type as string;
      
      let conditions = [eq(walletTransactions.userId, req.dbUser.id)];
      if (typeFilter) {
        conditions.push(eq(walletTransactions.type, typeFilter));
      }
      
      const txns = await db.select()
        .from(walletTransactions)
        .where(and(...conditions))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(limit)
        .offset(offset);
        
      res.json({
        success: true,
        transactions: txns,
        page,
        limit
      });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch transactions: ' + error.message });
    }
  });`;

code = code.replace(oldWalletGet, newWalletRoutes);
fs.writeFileSync('server.ts', code);
