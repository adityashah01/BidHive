const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const deleteApi = `
  app.delete('/api/admin/listings/:id', requireAuth, async (req: AuthRequest, res) => {
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const { id } = req.params;
    try {
      await db.transaction(async (tx) => {
        // Find if any transactions exist, we may also need to delete payment screenshots
        const txns = await tx.select().from(transactions).where(eq(transactions.listingId, id));
        for (const t of txns) {
          try {
            await tx.delete(paymentScreenshots).where(eq(paymentScreenshots.transactionId, t.id));
          } catch(e) {}
        }
        await tx.delete(transactions).where(eq(transactions.listingId, id));
        await tx.delete(reports).where(eq(reports.listingId, id));
        try {
          await tx.delete(walletHolds).where(eq(walletHolds.listingId, id));
        } catch(e) {}
        await tx.delete(listings).where(eq(listings.id, id));
      });
      res.json({ success: true, message: 'Listing permanently deleted' });
    } catch (error: any) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete listing: ' + error.message });
    }
  });
`;

code = code.replace(
  "app.post('/api/admin/listings/:id/status'",
  deleteApi + "\n  app.post('/api/admin/listings/:id/status'"
);

// We need to import walletHolds, paymentScreenshots if not imported.
if (!code.includes('paymentScreenshots')) {
  code = code.replace(
    "import { users, listings, categories, bids",
    "import { users, listings, categories, bids, paymentScreenshots, walletHolds"
  );
}

fs.writeFileSync('server.ts', code);
