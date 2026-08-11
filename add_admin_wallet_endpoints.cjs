const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoints = `
  app.get('/api/admin/wallets', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const search = (req.query.search as string) || '';
      
      const query = sql\`
        SELECT w.*, u.name as user_name, u.email as user_email
        FROM wallets w
        JOIN users u ON w.user_id = u.id
        WHERE u.name ILIKE \${'%' + search + '%'} OR u.email ILIKE \${'%' + search + '%'}
        ORDER BY w.available_balance DESC
        LIMIT 50
      \`;
      const result = await db.execute(query);
      res.json(result.rows || result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to fetch wallets: ' + error.message });
    }
  });

  app.post('/api/admin/wallets/adjust', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' });
    try {
      const { userId, amount, reason, action } = req.body;
      const amountNum = Number(amount);
      if (!reason || reason.trim() === '') throw new Error('Reason is compulsory');
      if (isNaN(amountNum) || amountNum <= 0) throw new Error('Invalid amount');
      
      const result = await db.transaction(async (tx) => {
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, userId)).then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found for user');
        
        const isCredit = action === 'CREDIT';
        if (!isCredit && wallet.availableBalance < amountNum) {
          throw new Error('Insufficient balance to deduct');
        }
        
        const balanceBefore = wallet.availableBalance;
        const balanceAfter = isCredit ? balanceBefore + amountNum : balanceBefore - amountNum;
        
        await tx.update(wallets).set({ availableBalance: balanceAfter }).where(eq(wallets.id, wallet.id));
        
        const txnId = generateId('wtx');
        await tx.insert(walletTransactions).values({
          id: txnId, walletId: wallet.id, userId,
          type: isCredit ? 'ADMIN_CREDIT' : 'ADMIN_DEBIT',
          amount: amountNum, status: 'SUCCESS',
          balanceBefore, balanceAfter,
          description: \`Admin adjustment: \${reason}\`,
          referenceType: 'admin_adjustment', referenceId: req.dbUser.id
        });
        
        return { walletId: wallet.id, balanceAfter };
      });
      
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // End of wallet admin endpoints
`;

code = code.replace(
  "  app.get('/api/admin/wallet-topups', requireAuth, async (req: AuthRequest, res) => {",
  newEndpoints + "\n  app.get('/api/admin/wallet-topups', requireAuth, async (req: AuthRequest, res) => {"
);

fs.writeFileSync('server.ts', code);
