const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. REWRITE `concludeExpiredAuctions`
const concludeRegex = /const concludeExpiredAuctions = async \(\) => \{[\s\S]*?(?=\n  \/\/ 2. Schedule cron for background checkout)/m;

const newConclude = `const concludeExpiredAuctions = async () => {
    try {
      const now = new Date();
      // Find active listings whose endTime has expired
      const expiredListings = await db.select()
        .from(listings)
        .where(and(eq(listings.status, 'ACTIVE'), lt(listings.endTime, now)));

      for (const listing of expiredListings) {
        // Fetch highest bid for this listing
        const highestBid = await db.select()
          .from(bids)
          .where(eq(bids.listingId, listing.id))
          .orderBy(desc(bids.amount))
          .limit(1)
          .then(r => r[0]);

        const seller = await db.select().from(users).where(eq(users.id, listing.sellerId)).then(r => r[0]);

        if (highestBid) {
          // Check if reserve price is achieved
          const reserveMet = !listing.reservePrice || highestBid.amount >= listing.reservePrice;

          if (reserveMet) {
            // Update status to SOLD
            await db.update(listings)
              .set({ status: 'SOLD', currentPrice: highestBid.amount })
              .where(eq(listings.id, listing.id));

            // Create Transaction with PAID status because we take it from Wallet
            const transactionId = generateId('txn');

            // --- WALLET INTEGRATION ---
            // Process wallet payment from locked balance
            const buyerWallet = await db.select().from(wallets).where(eq(wallets.userId, highestBid.bidderId)).then(r => r[0]);
            if (buyerWallet && buyerWallet.lockedBalance >= highestBid.amount) {
              const newLocked = buyerWallet.lockedBalance - highestBid.amount;
              await db.update(wallets).set({ lockedBalance: newLocked }).where(eq(wallets.userId, highestBid.bidderId));
              await db.insert(walletTransactions).values({
                id: generateId('wtx'),
                userId: highestBid.bidderId,
                type: 'AUCTION_PAYMENT',
                amount: highestBid.amount,
                balanceBefore: buyerWallet.balance,
                balanceAfter: buyerWallet.balance, // only locked changes
                referenceType: 'transactions',
                referenceId: transactionId,
                description: \`Paid for winning auction \${listing.title}\`
              });
              
              // We could also transfer to seller's wallet, but let's keep it simple and just deduct from buyer
            }

            await db.insert(transactions).values({
              id: transactionId,
              listingId: listing.id,
              listingTitle: listing.title,
              buyerId: highestBid.bidderId,
              buyerName: highestBid.bidderName,
              sellerId: listing.sellerId,
              sellerName: listing.sellerName,
              finalAmount: highestBid.amount,
              paymentStatus: 'PAID',
              paymentMethod: 'WALLET',
              paymentDeadline: now,
              completedAt: now,
            });

            // Buyer notification
            await db.insert(notifications).values({
              id: generateId('not'),
              userId: highestBid.bidderId,
              type: 'AUCTION_WON',
              message: \`Congratulations! You won the auction for "\${listing.title}". Rs. \${highestBid.amount.toLocaleString()} was deducted from your wallet.\`,
              isRead: false,
              link: listing.id,
            });

            // Seller notification
            await db.insert(notifications).values({
              id: generateId('not'),
              userId: listing.sellerId,
              type: 'AUCTION_ENDED',
              message: \`Your listing "\${listing.title}" successfully completed. Won by \${highestBid.bidderName} for Rs. \${highestBid.amount.toLocaleString()}.\`,
              isRead: false,
              link: listing.id,
            });

            const pusher = getPusher();
            if (pusher) {
              pusher.trigger(\`listing-\${listing.id}\`, 'new-bid', {
                listing: { ...listing, status: 'SOLD', currentPrice: highestBid.amount },
                bids: []
              }).catch(err => console.error("Pusher error:", err));
            }

          } else {
            // Reserve not met, end as ENDED
            await db.update(listings)
              .set({ status: 'ENDED' })
              .where(eq(listings.id, listing.id));

            // Release buyer's locked wallet balance since reserve not met
            const buyerWallet = await db.select().from(wallets).where(eq(wallets.userId, highestBid.bidderId)).then(r => r[0]);
            if (buyerWallet) {
              const newBalance = buyerWallet.balance + highestBid.amount;
              const newLocked = Math.max(0, buyerWallet.lockedBalance - highestBid.amount);
              await db.update(wallets).set({ balance: newBalance, lockedBalance: newLocked }).where(eq(wallets.id, buyerWallet.id));
              await db.insert(walletTransactions).values({
                id: generateId('wtx'),
                userId: highestBid.bidderId,
                type: 'BID_RELEASE',
                amount: highestBid.amount,
                balanceBefore: buyerWallet.balance,
                balanceAfter: newBalance,
                referenceType: 'listings',
                referenceId: listing.id,
                description: \`Reserve not met. Released locked balance for \${listing.title}\`
              });
            }

            // Seller notification
            await db.insert(notifications).values({
              id: generateId('not'),
              userId: listing.sellerId,
              type: 'AUCTION_ENDED',
              message: \`Your listing "\${listing.title}" expired. Highest bid Rs. \${highestBid.amount.toLocaleString()} did not achieve reserve price.\`,
              isRead: false,
              link: listing.id,
            });

            const pusher = getPusher();
            if (pusher) {
              pusher.trigger(\`listing-\${listing.id}\`, 'new-bid', {
                listing: { ...listing, status: 'ENDED' },
                bids: []
              }).catch(err => console.error("Pusher error:", err));
            }
          }
        } else {
          // No bids at all, end as ENDED
          await db.update(listings)
            .set({ status: 'ENDED' })
            .where(eq(listings.id, listing.id));

          // Seller notification
          await db.insert(notifications).values({
            id: generateId('not'),
            userId: listing.sellerId,
            type: 'AUCTION_ENDED',
            message: \`Your listing "\${listing.title}" expired with zero bids.\`,
            isRead: false,
            link: listing.id,
          });

          const pusher = getPusher();
          if (pusher) {
            pusher.trigger(\`listing-\${listing.id}\`, 'new-bid', {
              listing: { ...listing, status: 'ENDED' },
              bids: []
            }).catch(err => console.error("Pusher error:", err));
          }
        }
      }
    } catch (err: any) {
      console.error('Error concluding expired auctions:', err.message);
    }
  };`;
code = code.replace(concludeRegex, newConclude);


// 2. REWRITE `app.post('/api/listings/:id/bid'`
const bidRegex = /app\.post\('\/api\/listings\/:id\/bid', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?(?=\n  \/\/ 8\. Setup Auto-Bid Config)/m;

const newBid = `app.post('/api/listings/:id/bid', requireAuth, async (req: AuthRequest, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    const bidAmount = Number(amount);

    if (req.dbUser.isBanned) {
      return res.status(403).json({ error: 'Your account has been restricted from placing bids.' });
    }

    try {
      await concludeExpiredAuctions();

      const result = await db.transaction(async (tx) => {
        // Fetch listing with row lock (FOR UPDATE)
        const listing = await tx.select().from(listings).where(eq(listings.id, id)).for('update').then(r => r[0]);
        if (!listing) throw new Error('Listing not found');
        if (listing.status !== 'ACTIVE') throw new Error('Auction is not active');
        
        const now = new Date();
        if (now > new Date(listing.endTime)) throw new Error('Auction has already ended');
        if (bidAmount <= listing.currentPrice) throw new Error(\`Bid amount must be greater than current price of NPR \${listing.currentPrice}\`);
        if (listing.sellerId === req.dbUser.id) throw new Error('Sellers cannot bid on their own listings');

        // Check Wallet Balance
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        if (!wallet || wallet.balance < bidAmount) {
          throw new Error('Insufficient wallet balance. Please top up your wallet first.');
        }

        // Check Anti-Sniping
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

        // Release previous highest bidder's locked balance
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        if (previousHighBids.length > 0) {
          const prevHighBidder = previousHighBids[0];
          let prevWallet = await tx.select().from(wallets).where(eq(wallets.userId, prevHighBidder.bidderId)).then(r => r[0]);
          if (prevWallet) {
            const newBalance = prevWallet.balance + prevHighBidder.amount;
            const newLocked = Math.max(0, prevWallet.lockedBalance - prevHighBidder.amount);
            await tx.update(wallets).set({ balance: newBalance, lockedBalance: newLocked }).where(eq(wallets.id, prevWallet.id));
            
            await tx.insert(walletTransactions).values({
              id: generateId('wtx'), userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
              amount: prevHighBidder.amount, balanceBefore: prevWallet.balance, balanceAfter: newBalance,
              referenceType: 'listings', referenceId: listing.id,
              description: \`Released locked balance for outbid on \${listing.title}\`
            });
          }

          // Notify outbid user
          await tx.insert(notifications).values({
            id: generateId('not'), userId: prevHighBidder.bidderId, type: 'OUTBID',
            message: \`You have been outbid on "\${listing.title}". The current high bid is Rs. \${bidAmount}.\`, isRead: false, link: id,
          });
        }

        // Lock current bidder's balance
        const newBalance = wallet.balance - bidAmount;
        const newLocked = wallet.lockedBalance + bidAmount;
        await tx.update(wallets).set({ balance: newBalance, lockedBalance: newLocked }).where(eq(wallets.id, wallet.id));
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), userId: req.dbUser.id, type: 'BID_LOCK',
          amount: bidAmount, balanceBefore: wallet.balance, balanceAfter: newBalance,
          referenceType: 'listings', referenceId: listing.id,
          description: \`Locked balance for bid on \${listing.title}\`
        });

        // Record manual bid
        const manualBidId = generateId('bid');
        await tx.insert(bids).values({
          id: manualBidId, listingId: id, bidderId: req.dbUser.id,
          bidderName: req.dbUser.name, amount: bidAmount, isAutoBid: false,
        });

        // Update listing
        await tx.update(listings)
          .set({ currentPrice: bidAmount })
          .where(eq(listings.id, id));

        const updatedListing = await tx.select().from(listings).where(eq(listings.id, id)).then(r => r[0]);
        const updatedBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount));

        const pusher = getPusher();
        if (pusher) {
          pusher.trigger(\`listing-\${id}\`, 'new-bid', {
            listing: updatedListing,
            bids: updatedBids,
          }).catch(err => console.error("Pusher error:", err));
        }

        return { listing: updatedListing, bids: updatedBids };
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });`;
code = code.replace(bidRegex, newBid);


// 3. REWRITE `app.post('/api/listings/:id/buynow'`
const buyNowRegex = /app\.post\('\/api\/listings\/:id\/buynow', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?(?=\n  \/\/ 10\. Get User Transactions)/m;

const newBuyNow = `app.post('/api/listings/:id/buynow', requireAuth, async (req: AuthRequest, res) => {
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
        if (listing.sellerId === req.dbUser.id) {
          throw new Error('Sellers cannot buy their own listings');
        }

        // Check wallet
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        if (!wallet || wallet.balance < listing.buyNowPrice) {
          throw new Error('Insufficient wallet balance for Buy Now. Please top up your wallet.');
        }

        // Release previous highest bidder's locked balance if any
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        if (previousHighBids.length > 0) {
          const prevHighBidder = previousHighBids[0];
          let prevWallet = await tx.select().from(wallets).where(eq(wallets.userId, prevHighBidder.bidderId)).then(r => r[0]);
          if (prevWallet) {
            const newBalance = prevWallet.balance + prevHighBidder.amount;
            const newLocked = Math.max(0, prevWallet.lockedBalance - prevHighBidder.amount);
            await tx.update(wallets).set({ balance: newBalance, lockedBalance: newLocked }).where(eq(wallets.id, prevWallet.id));
            
            await tx.insert(walletTransactions).values({
              id: generateId('wtx'), userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
              amount: prevHighBidder.amount, balanceBefore: prevWallet.balance, balanceAfter: newBalance,
              referenceType: 'listings', referenceId: listing.id,
              description: \`Released locked balance for Buy Now on \${listing.title}\`
            });
          }
        }

        // Deduct from current buyer directly
        const newBalance = wallet.balance - listing.buyNowPrice;
        await tx.update(wallets).set({ balance: newBalance }).where(eq(wallets.id, wallet.id));
        
        const transactionId = generateId('txn');
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), userId: req.dbUser.id, type: 'AUCTION_PAYMENT',
          amount: listing.buyNowPrice, balanceBefore: wallet.balance, balanceAfter: newBalance,
          referenceType: 'transactions', referenceId: transactionId,
          description: \`Paid for Buy Now on \${listing.title}\`
        });

        // Mark listing as SOLD
        await tx.update(listings)
          .set({ status: 'SOLD', currentPrice: listing.buyNowPrice })
          .where(eq(listings.id, id));

        // Create transaction
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

        const pusher = getPusher();
        if (pusher) {
          pusher.trigger(\`listing-\${id}\`, 'new-bid', {
            listing: { ...listing, status: 'SOLD', currentPrice: listing.buyNowPrice },
            bids: [] 
          }).catch(err => console.error("Pusher error:", err));
        }

        return newTxn[0];
      });

      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Buy now purchase failed: ' + error.message });
    }
  });`;

// Note: Replace before Wallet Routes block. The original file has "  // 10. Get User Transactions" after Buy Now.
// Because we already injected wallet routes before "10. Get User Transactions", the next block after buynow is "  // Wallet Routes"
const buyNowRegex2 = /app\.post\('\/api\/listings\/:id\/buynow', requireAuth, async \(req: AuthRequest, res\) => \{[\s\S]*?(?=\n  \/\/ Wallet Routes)/m;
code = code.replace(buyNowRegex2, newBuyNow);

fs.writeFileSync('server.ts', code);
console.log('Updated Logic');
