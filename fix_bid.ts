import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const bidStart = "app.post('/api/listings/:id/bid', requireAuth, async (req: AuthRequest, res) => {";
// Let's replace the whole app.post('/api/listings/:id/bid') endpoint!
const bidEnd = "// 8. Create a new listing";

const newBidCode = `
  app.post('/api/listings/:id/bid', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const bidAmount = Number(amount);

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Your account has been restricted from placing bids.' });
    }

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        // Lock listing first to prevent deadlocks
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (now < new Date(listing.startTime)) throw new Error('Auction has not started yet');
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot bid on their own listings');
        
        // Minimum bid increment logic
        const currentBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const minRequired = currentBids.length > 0 ? listing.currentPrice + 100 : listing.startingPrice; // e.g., 100 increments
        if (bidAmount < minRequired) throw new Error(\`Bid amount must be at least NPR \${minRequired}\`);

        const prevHighBidder = currentBids.length > 0 ? currentBids[0] : null;
        const isSameBidder = prevHighBidder && prevHighBidder.bidderId === req.dbUser.id;

        // Wallet Locks: We must order the locks consistently if locking multiple wallets.
        // E.g., user1 and user2. Lock the one with smaller ID first.
        let usersToLock = [req.dbUser.id];
        if (prevHighBidder && !isSameBidder) {
            usersToLock.push(prevHighBidder.bidderId);
        }
        usersToLock.sort(); // ascending

        const lockedWallets = new Map();
        for (const uid of usersToLock) {
            const w = await tx.select().from(wallets).where(eq(wallets.userId, uid)).for('update').then(r => r[0]);
            if (w) lockedWallets.set(uid, w);
        }

        const wallet = lockedWallets.get(req.dbUser.id);
        if (!wallet) throw new Error('Wallet not found');

        // Existing active hold for current bidder
        const myActiveHold = await tx.select().from(walletHolds)
          .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, req.dbUser.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update').then(r => r[0]);

        const previouslyHeld = myActiveHold ? Number(myActiveHold.amount) : 0;
        const requiredAdditionalBalance = bidAmount - previouslyHeld;

        if (requiredAdditionalBalance > 0 && wallet.availableBalance < requiredAdditionalBalance) {
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

        // Refund previous high bidder if it's someone else
        if (prevHighBidder && !isSameBidder) {
          const prevWallet = lockedWallets.get(prevHighBidder.bidderId);
          if (prevWallet) {
            const prevActiveHold = await tx.select().from(walletHolds)
               .where(and(eq(walletHolds.listingId, id), eq(walletHolds.userId, prevHighBidder.bidderId), eq(walletHolds.status, 'ACTIVE')))
               .for('update').then(r => r[0]);
               
            if (prevActiveHold) {
                const amountToRelease = Number(prevActiveHold.amount);
                const newBalance = prevWallet.availableBalance + amountToRelease;
                const newHeld = prevWallet.heldBalance - amountToRelease;
                await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, prevWallet.id));
                
                await tx.insert(walletTransactions).values({
                  id: generateId('wtx'), walletId: prevWallet.id, userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
                  amount: amountToRelease, status: 'SUCCESS', balanceBefore: prevWallet.availableBalance, balanceAfter: newBalance,
                  referenceType: 'listings', referenceId: listing.id,
                  description: \`Released held balance for outbid on \${listing.title}\`
                });
                
                await tx.update(walletHolds).set({ status: 'RELEASED', updatedAt: new Date() })
                   .where(eq(walletHolds.id, prevActiveHold.id));
            }
          }
        }

        // Hold funds from current bidder
        if (requiredAdditionalBalance !== 0) {
            const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
            const newHeldBalance = wallet.heldBalance + requiredAdditionalBalance;
            
            await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
            
            await tx.insert(walletTransactions).values({
              id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: requiredAdditionalBalance > 0 ? 'BID_HOLD' : 'BID_RELEASE',
              amount: Math.abs(requiredAdditionalBalance), status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
              referenceType: 'listings', referenceId: listing.id,
              description: isSameBidder ? \`Held additional balance for increased bid on \${listing.title}\` : \`Held balance for new bid on \${listing.title}\`
            });
        }

        const bidId = generateId('bid');
        const newBid = await tx.insert(bids).values({
          id: bidId,
          listingId: id,
          bidderId: req.dbUser.id,
          bidderName: req.dbUser.name,
          amount: bidAmount,
          isAutoBid: false,
        }).returning();

        if (myActiveHold) {
           await tx.update(walletHolds).set({ amount: bidAmount, bidId, updatedAt: new Date() }).where(eq(walletHolds.id, myActiveHold.id));
        } else {
           await tx.insert(walletHolds).values({
             id: generateId('whd'),
             userId: req.dbUser.id,
             walletId: wallet.id,
             listingId: listing.id,
             bidId: bidId,
             amount: bidAmount,
             status: 'ACTIVE'
           });
        }

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

      const pusherClient = getPusher();
      if (pusherClient) {
        pusherClient.trigger(\`listing-\${id}\`, 'new_bid', {
          bid: result.bid,
          currentPrice: bidAmount
        }).catch(err => console.error('Pusher event error:', err));
      }

      res.json(result);
    } catch (err: any) {
      if (err.message.includes('Insufficient') || err.message.includes('ended') || err.message.includes('must be at least')) {
          res.status(409).json({ error: err.message });
      } else {
          res.status(400).json({ error: err.message });
      }
    }
  });

  `;
  
const startIdx = content.indexOf(bidStart);
const endIdx = content.indexOf(bidEnd);
if (startIdx !== -1 && endIdx !== -1) {
  content = content.substring(0, startIdx) + newBidCode + content.substring(endIdx);
  fs.writeFileSync('server.ts', content);
  console.log('Bid endpoint fixed.');
}
