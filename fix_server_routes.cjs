const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We need to replace the entire app.post('/api/listings/:id/bid') ...
const bidStart = code.indexOf("app.post('/api/listings/:id/bid'");
const buyNowStart = code.indexOf("app.post('/api/listings/:id/buynow'");

if (bidStart > -1 && buyNowStart > -1) {
  const newBidLogic = `app.post('/api/listings/:id/bid', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const bidAmount = Number(amount);

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Your account has been restricted from placing bids.' });
    }

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (bidAmount <= listing.currentPrice) throw new Error(\`Bid amount must be greater than current price of NPR \${listing.currentPrice}\`);
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot bid on their own listings');

        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const prevHighBidder = previousHighBids.length > 0 ? previousHighBids[0] : null;
        
        const isSameBidder = prevHighBidder && prevHighBidder.bidderId === req.dbUser.id;
        const requiredAdditionalBalance = isSameBidder ? (bidAmount - prevHighBidder.amount) : bidAmount;

        if (!wallet || wallet.availableBalance < requiredAdditionalBalance) {
          throw new Error('Insufficient wallet balance. Please add funds to your wallet.');
        }

        const currentEndTime = new Date(listing.endTime);
        const twoMinutesInMs = 2 * 60 * 1000;
        const timeRemaining = currentEndTime.getTime() - now.getTime();
        let activeEndTime = currentEndTime;

        if (timeRemaining > 0 && timeRemaining <= twoMinutesInMs) {
          activeEndTime = new Date(now.getTime() + twoMinutesInMs);
          await tx.update(listings).set({ endTime: activeEndTime }).where(eq(listings.id, id));
          
          await tx.insert(notifications).values({
            id: generateId('not'), userId: listing.sellerId, type: 'AUCTION_ENDED',
            message: \`Auction for "\${listing.title}" extended by 2 minutes to prevent sniping.\`, isRead: false, link: id,
          });
        }

        if (prevHighBidder && !isSameBidder) {
          let prevWallet = await tx.select().from(wallets).where(eq(wallets.userId, prevHighBidder.bidderId)).then(r => r[0]);
          if (prevWallet) {
            const newBalance = prevWallet.availableBalance + prevHighBidder.amount;
            const newHeld = Math.max(0, prevWallet.heldBalance - prevHighBidder.amount);
            await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, prevWallet.id));
            
            await tx.insert(walletTransactions).values({
              id: generateId('wtx'), walletId: prevWallet.id, userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
              amount: prevHighBidder.amount, status: 'SUCCESS', balanceBefore: prevWallet.availableBalance, balanceAfter: newBalance,
              referenceType: 'listings', referenceId: listing.id,
              description: \`Released held balance for outbid on \${listing.title}\`
            });
            
            await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() })
               .where(and(eq(walletHolds.listingId, listing.id), eq(walletHolds.userId, prevHighBidder.bidderId), eq(walletHolds.status, 'ACTIVE')));
          }
        }

        const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
        const newHeldBalance = wallet.heldBalance + requiredAdditionalBalance;
        
        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'BID_HOLD',
          amount: requiredAdditionalBalance, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'listings', referenceId: listing.id,
          description: isSameBidder ? \`Held additional balance for increased bid on \${listing.title}\` : \`Held balance for new bid on \${listing.title}\`
        });

        const bidId = generateId('bid');
        const newBid = await tx.insert(bids).values({
          id: bidId,
          listingId: id,
          bidderId: req.dbUser.id,
          bidderName: req.dbUser.name,
          amount: bidAmount,
          isAutoBid: false,
        }).returning();

        await tx.insert(walletHolds).values({
          id: generateId('whd'),
          userId: req.dbUser.id,
          walletId: wallet.id,
          listingId: listing.id,
          bidId: bidId,
          amount: bidAmount,
          status: 'ACTIVE'
        });

        await tx.update(listings).set({ currentPrice: bidAmount }).where(eq(listings.id, id));

        await tx.insert(notifications).values({
          id: generateId('not'), userId: listing.sellerId, type: 'OUTBID',
          message: \`New bid of NPR \${bidAmount} placed on "\${listing.title}"\`, isRead: false, link: id,
        });

        if (prevHighBidder && !isSameBidder) {
          await tx.insert(notifications).values({
            id: generateId('not'), userId: prevHighBidder.bidderId, type: 'OUTBID',
            message: \`You have been outbid on "\${listing.title}"\`, isRead: false, link: id,
          });
        }

        return { bid: newBid[0], listing: { ...listing, currentPrice: bidAmount, endTime: activeEndTime } };
      });

      pusher.trigger(\`listing-\${id}\`, 'new-bid', result);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to place bid' });
    }
  });\n\n  `;

  code = code.substring(0, bidStart) + newBidLogic + code.substring(buyNowStart);
}

// Now replace Topup approve
const approveStart = code.indexOf("app.post('/api/admin/wallet-topups/:topupId/approve'");
const rejectStart = code.indexOf("app.post('/api/admin/wallet-topups/:topupId/reject'");

if (approveStart > -1 && rejectStart > -1) {
  const newApproveLogic = `app.post('/api/admin/wallet-topups/:topupId/approve', requireAuth, async (req: AuthRequest, res) => {
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
            availableBalance: 0,
            heldBalance: 0
          }).returning();
          wallet = newWallet;
        }

        const balanceBefore = wallet.availableBalance;
        const balanceAfter = balanceBefore + topup.amount;

        await tx.update(wallets)
          .set({ availableBalance: balanceAfter, updatedAt: new Date() })
          .where(eq(wallets.id, wallet.id));

        const [updatedTopup] = await tx.update(walletTopups)
          .set({ 
             status: 'APPROVED', 
             approvedBy: req.dbUser.id, 
             approvedAt: new Date(),
             updatedAt: new Date()
          })
          .where(eq(walletTopups.id, topup.id))
          .returning();

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

        await tx.insert(notifications).values({
          id: generateId('not'),
          userId: topup.userId,
          type: 'PAYMENT_RECEIVED',
          message: \`Your wallet top-up of Rs. \${topup.amount} was approved.\`,
          link: '/dashboard',
          isRead: false
        });

        return updatedTopup;
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to approve topup: ' + error.message });
    }
  });\n\n  `;
  
  code = code.substring(0, approveStart) + newApproveLogic + code.substring(rejectStart);
}

fs.writeFileSync('server.ts', code);
