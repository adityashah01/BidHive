import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const buyStart = "app.post('/api/listings/:id/buynow', requireAuth, async (req: AuthRequest, res) => {";
const buyEnd = "// Wallet Routes";

const newBuyCode = `
  app.post('/api/listings/:id/buynow', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing || !listing.buyNowPrice) {
          throw new Error('Listing not found or Buy Now option is not available');
        }
        if (listing.status !== 'ACTIVE') {
          throw new Error('Listing is not active');
        }
        const now = new Date();
        if (now > new Date(listing.endTime)) {
          throw new Error('Auction has already ended');
        }
        if (listing.sellerId === req.dbUser.id) {
          throw new Error('Sellers cannot buy their own listings');
        }

        // We need to lock the buyer and seller wallet in a consistent order
        let usersToLock = [req.dbUser.id, listing.sellerId];
        usersToLock.sort();

        const lockedWallets = new Map();
        for (const uid of usersToLock) {
            let w = await tx.select().from(wallets).where(eq(wallets.userId, uid)).for('update').then(r => r[0]);
            if (!w) {
                // Try to create wallet if missing, particularly for seller
                const [newW] = await tx.insert(wallets).values({
                    id: generateId('wal'),
                    userId: uid,
                    availableBalance: 0,
                    heldBalance: 0,
                }).returning();
                w = newW;
            }
            lockedWallets.set(uid, w);
        }

        const wallet = lockedWallets.get(req.dbUser.id);
        const sellerWallet = lockedWallets.get(listing.sellerId);
        
        if (!wallet || !sellerWallet) throw new Error('Failed to resolve wallets');

        // Existing active hold for current buyer?
        const myActiveHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);

        const previouslyHeld = myActiveHold ? Number(myActiveHold.amount) : 0;
        const requiredAdditionalBalance = listing.buyNowPrice - previouslyHeld;

        if (requiredAdditionalBalance > 0 && wallet.availableBalance < requiredAdditionalBalance) {
          throw new Error('Insufficient wallet balance for Buy Now. Please add funds to your wallet.');
        }

        // Release other bidders' locked balances
        const allHolds = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.status, 'ACTIVE')))
          .for('update');
          
        for (const hold of allHolds) {
           if (hold.userId === req.dbUser.id) continue;
           let otherWallet = await tx.select().from(wallets).where(eq(wallets.userId, hold.userId)).for('update').then(r => r[0]);
           if (otherWallet) {
              const amountToRelease = Number(hold.amount);
              const newBalance = otherWallet.availableBalance + amountToRelease;
              const newHeld = otherWallet.heldBalance - amountToRelease;
              await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, otherWallet.id));
              
              await tx.insert(walletTransactions).values({
                 id: generateId('wtx'), walletId: otherWallet.id, userId: hold.userId, type: 'BID_RELEASE',
                 amount: amountToRelease, status: 'SUCCESS', balanceBefore: otherWallet.availableBalance, balanceAfter: newBalance,
                 referenceType: 'listings', referenceId: listing.id,
                 description: \`Released held balance for sold item \${listing.title}\`
              });
           }
           await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() }).where(eq(walletHolds.id, hold.id));
        }

        // Deduct from current buyer
        const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
        const newHeldBalance = wallet.heldBalance - previouslyHeld; // We capture the hold!
        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        if (myActiveHold) {
           await tx.update(walletHolds).set({ status: 'CAPTURED', updatedAt: new Date() }).where(eq(walletHolds.id, myActiveHold.id));
        }

        const transactionId = generateId('txn');
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'AUCTION_PAYMENT',
          amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'transactions', referenceId: transactionId,
          description: \`Payment for Buy Now on \${listing.title}\`
        });

        // Add 100% of price to seller wallet
        const newSellerBal = sellerWallet.availableBalance + listing.buyNowPrice;
        await tx.update(wallets).set({ availableBalance: newSellerBal }).where(eq(wallets.id, sellerWallet.id));
        await tx.insert(walletTransactions).values({
             id: generateId('wtx'), walletId: sellerWallet.id, userId: listing.sellerId, type: 'AUCTION_PAYMENT',
             amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: sellerWallet.availableBalance, balanceAfter: newSellerBal,
             referenceType: 'transactions', referenceId: transactionId,
             description: \`Received payment for sold item \${listing.title}\`
        });
          
        const newTxn = await tx.insert(transactions).values({
          id: transactionId,
          listingId: id,
          listingTitle: listing.title,
          buyerId: req.dbUser.id,
          buyerName: req.dbUser.name,
          sellerId: listing.sellerId,
          sellerName: listing.sellerName,
          finalAmount: listing.buyNowPrice,
          paymentStatus: 'PAID',
          paymentMethod: 'WALLET',
          paymentDeadline: new Date(),
          completedAt: new Date()
        }).returning();
        
        // Update listing status
        await tx.update(listings).set({ status: 'SOLD', currentPrice: listing.buyNowPrice, endTime: new Date() }).where(eq(listings.id, id));

        // Notifications
        await tx.insert(notifications).values({
          id: generateId('not'), userId: listing.sellerId, type: 'AUCTION_ENDED',
          message: \`Your listing "\${listing.title}" was purchased instantly by \${req.dbUser.name} via Wallet for NPR \${listing.buyNowPrice}.\`,
          isRead: false, link: id,
        });

        await tx.insert(notifications).values({
          id: generateId('not'), userId: req.dbUser.id, type: 'AUCTION_WON',
          message: \`You successfully purchased "\${listing.title}" via Buy Now. Rs. \${listing.buyNowPrice} was deducted from your Wallet.\`,
          isRead: false, link: id,
        });

        return { txn: newTxn[0], listing: { ...listing, status: 'SOLD', currentPrice: listing.buyNowPrice } };
      });

      const pusher = getPusher();
      if (pusher) {
        pusher.trigger(\`listing-\${id}\`, 'new-bid', {
          listing: result.listing,
          bids: [] 
        }).catch(err => console.error("Pusher error:", err));
      }

      res.json(result.txn);
    } catch (error: any) {
      if (error.message.includes('Insufficient') || error.message.includes('ended') || error.message.includes('active')) {
          res.status(409).json({ error: 'Buy now purchase failed: ' + error.message });
      } else {
          res.status(500).json({ error: 'Buy now purchase failed: ' + error.message });
      }
    }
  });
  
`;

const startIdx = content.indexOf(buyStart);
const endIdx = content.indexOf(buyEnd);
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newBuyCode + content.substring(endIdx);
  fs.writeFileSync('server.ts', content);
  console.log('Buy-now endpoint fixed.');
}
