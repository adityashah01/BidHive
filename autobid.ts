import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const autobidCode = `
  // AUTO BID: Get current user's configuration
  app.get('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const [config] = await db.select().from(autoBidConfigs)
        .where(and(
          eq(autoBidConfigs.listingId, id),
          eq(autoBidConfigs.bidderId, req.dbUser.id),
          eq(autoBidConfigs.isActive, true)
        ));
      res.json(config || null);
    } catch(err:any) {
      res.status(500).json({ error: err.message });
    }
  });

  // AUTO BID: Create or update configuration
  app.post('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const maxAmount = Number(req.body.maxAmount);

      if (req.dbUser.isBanned) return res.status(403).json({ error: 'Your account has been restricted' });
      if (!maxAmount || maxAmount <= 0) return res.status(400).json({ error: 'Invalid maximum amount' });

      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (now < new Date(listing.startTime)) throw new Error('Auction has not started yet');
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot auto-bid on their own listings');
        
        // Minimum bid validation (e.g. at least currentPrice + 1, or higher based on rules)
        // A minimal requirement is that maxAmount > currentPrice (or equal to startingPrice if 0 bids)
        const currentBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const minRequired = currentBids.length > 0 ? listing.currentPrice + 1 : listing.startingPrice; // simplistic increment
        
        if (maxAmount < minRequired) {
          throw new Error(\`Max amount must be at least NPR \${minRequired}\`);
        }

        const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).for('update').then(r => r[0]);
        if (!wallet) throw new Error('Wallet not found');

        // Existing hold
        const existingHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);
          
        const previouslyHeld = existingHold ? Number(existingHold.amount) : 0;
        const requiredAdditional = maxAmount - previouslyHeld;

        if (requiredAdditional > 0 && wallet.availableBalance < requiredAdditional) {
           throw new Error('Insufficient wallet balance to secure this auto-bid maximum');
        }

        // Apply wallet changes
        const newAvailable = wallet.availableBalance - requiredAdditional;
        const newHeld = wallet.heldBalance + requiredAdditional;
        await tx.update(wallets).set({ availableBalance: newAvailable, heldBalance: newHeld }).where(eq(wallets.id, wallet.id));
        
        if (requiredAdditional !== 0) {
           await tx.insert(walletTransactions).values({
             id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: requiredAdditional > 0 ? 'BID_HOLD' : 'BID_RELEASE',
             amount: Math.abs(requiredAdditional), status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailable,
             referenceType: 'listings', referenceId: listing.id,
             description: \`Adjusted auto-bid hold on \${listing.title}\`
           });
        }

        if (existingHold) {
           await tx.update(walletHolds).set({ amount: maxAmount, updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
        } else {
           await tx.insert(walletHolds).values({
             id: generateId('whd'), userId: req.dbUser.id, walletId: wallet.id, listingId: id,
             amount: maxAmount, status: 'ACTIVE'
           });
        }

        // Upsert auto-bid config
        const existingConfig = await tx.select().from(autoBidConfigs)
          .where(and(eq(autoBidConfigs.listingId, id), eq(autoBidConfigs.bidderId, req.dbUser.id)))
          .for('update').then(r => r[0]);

        let finalConfig;
        if (existingConfig) {
           const [upd] = await tx.update(autoBidConfigs).set({ maxAmount, isActive: true }).where(eq(autoBidConfigs.id, existingConfig.id)).returning();
           finalConfig = upd;
        } else {
           const [ins] = await tx.insert(autoBidConfigs).values({
             id: generateId('abc'), listingId: id, bidderId: req.dbUser.id, maxAmount, isActive: true
           }).returning();
           finalConfig = ins;
        }
        
        // After setting auto-bid, we may need to execute the auto-bidding algorithm immediately.
        // But doing it here inside the transaction can get complex. 
        // We'll call a helper function after the transaction, or do it inside if needed.
        return { config: finalConfig };
      });
      
      // Attempt to trigger auto bids
      // processAutoBids(id);
      
      res.json(result.config);
    } catch(err:any) { res.status(409).json({ error: err.message }); }
  });

  // AUTO BID: Cancel
  app.post('/api/listings/:id/autobid/cancel', requireAuth, async (req: AuthRequest, res) => {
    // wait, route was DELETE /api/listings/:id/autobid
    res.status(501).json({ error: 'Use DELETE instead' });
  });
  
  app.delete('/api/listings/:id/autobid', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const result = await db.transaction(async (tx) => {
        const config = await tx.select().from(autoBidConfigs)
          .where(and(eq(autoBidConfigs.listingId, id), eq(autoBidConfigs.bidderId, req.dbUser.id), eq(autoBidConfigs.isActive, true)))
          .for('update').then(r => r[0]);
          
        if (!config) throw new Error('Auto-bid not found or already inactive');
        
        await tx.update(autoBidConfigs).set({ isActive: false }).where(eq(autoBidConfigs.id, config.id));
        
        // Now reduce the hold to the actual current bid amount (if they are the highest bidder) or release it
        const currentBids = await tx.select().from(bids).where(and(eq(bids.listingId, id), eq(bids.bidderId, req.dbUser.id))).orderBy(desc(bids.amount)).limit(1);
        const myHighestBid = currentBids.length > 0 ? Number(currentBids[0].amount) : 0;
        
        // Are we the absolute highest bidder?
        const highestBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const isOverallHighest = highestBids.length > 0 && highestBids[0].bidderId === req.dbUser.id;
        
        const requiredHoldAmount = isOverallHighest ? Number(highestBids[0].amount) : 0;
        
        const existingHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);
          
        if (existingHold) {
          const wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).for('update').then(r => r[0]);
          if (wallet) {
             const heldAmount = Number(existingHold.amount);
             if (heldAmount > requiredHoldAmount) {
                const releaseAmount = heldAmount - requiredHoldAmount;
                const newAvailable = wallet.availableBalance + releaseAmount;
                const newHeld = wallet.heldBalance - releaseAmount;
                
                await tx.update(wallets).set({ availableBalance: newAvailable, heldBalance: newHeld }).where(eq(wallets.id, wallet.id));
                await tx.insert(walletTransactions).values({
                  id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'BID_RELEASE',
                  amount: releaseAmount, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailable,
                  referenceType: 'listings', referenceId: id,
                  description: \`Released excess balance after cancelling auto-bid on listing\`
                });
                
                if (requiredHoldAmount === 0) {
                  await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
                } else {
                  await tx.update(walletHolds).set({ amount: requiredHoldAmount, updatedAt: new Date() }).where(eq(walletHolds.id, existingHold.id));
                }
             }
          }
        }
        return { success: true };
      });
      res.json(result);
    } catch(err:any) { res.status(400).json({ error: err.message }); }
  });

`;

content = content.replace("// 7. Place a bid", autobidCode + "\n  // 7. Place a bid");

fs.writeFileSync('server.ts', content);
