const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Check Wallet Balance[\s\S]*?(?=\/\/ Record the bid)/;

const newLogic = `// Check Wallet Balance
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        
        // Find previous highest bidder
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        const prevHighBidder = previousHighBids.length > 0 ? previousHighBids[0] : null;
        
        const isSameBidder = prevHighBidder && prevHighBidder.bidderId === req.dbUser.id;
        const requiredAdditionalBalance = isSameBidder ? (bidAmount - prevHighBidder.amount) : bidAmount;

        if (!wallet || wallet.availableBalance < requiredAdditionalBalance) {
          throw new Error('Insufficient wallet balance. Please add funds to your wallet.');
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

        // Release previous highest bidder's locked balance IF it's a different user
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

        // Hold the balance for the current bidder
        const newAvailableBalance = wallet.availableBalance - requiredAdditionalBalance;
        const newHeldBalance = wallet.heldBalance + requiredAdditionalBalance;
        
        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'BID_HOLD',
          amount: requiredAdditionalBalance, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'listings', referenceId: listing.id,
          description: isSameBidder ? \`Held additional balance for increased bid on \${listing.title}\` : \`Held balance for new bid on \${listing.title}\`
        });
        
        `;

code = code.replace(regex, newLogic);
fs.writeFileSync('server.ts', code);
