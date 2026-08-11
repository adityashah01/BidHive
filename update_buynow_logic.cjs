const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ Check wallet[\s\S]*?(?=const newTxn = await tx\.insert\(transactions\))/;

const newLogic = `// Check wallet
        let wallet = await tx.select().from(wallets).where(eq(wallets.userId, req.dbUser.id)).then(r => r[0]);
        if (!wallet || wallet.availableBalance < listing.buyNowPrice) {
          throw new Error('Insufficient wallet balance for Buy Now. Please add funds to your wallet.');
        }

        // Release previous highest bidder's locked balance if any
        const previousHighBids = await tx.select().from(bids).where(eq(bids.listingId, id)).orderBy(desc(bids.amount)).limit(1);
        if (previousHighBids.length > 0) {
          const prevHighBidder = previousHighBids[0];
          
          if (prevHighBidder.bidderId !== req.dbUser.id) {
             let prevWallet = await tx.select().from(wallets).where(eq(wallets.userId, prevHighBidder.bidderId)).then(r => r[0]);
             if (prevWallet) {
               const newBalance = prevWallet.availableBalance + prevHighBidder.amount;
               const newHeld = Math.max(0, prevWallet.heldBalance - prevHighBidder.amount);
               await tx.update(wallets).set({ availableBalance: newBalance, heldBalance: newHeld }).where(eq(wallets.id, prevWallet.id));
               
               await tx.insert(walletTransactions).values({
                 id: generateId('wtx'), walletId: prevWallet.id, userId: prevHighBidder.bidderId, type: 'BID_RELEASE',
                 amount: prevHighBidder.amount, status: 'SUCCESS', balanceBefore: prevWallet.availableBalance, balanceAfter: newBalance,
                 referenceType: 'listings', referenceId: listing.id,
                 description: \`Released held balance for Buy Now outbid on \${listing.title}\`
               });
             }
          }
        }

        // Deduct from current buyer directly
        // If the buyer is the previous high bidder, they already had some held balance, we should use that + available balance
        let amountToDeduct = listing.buyNowPrice;
        let newAvailableBalance = wallet.availableBalance;
        let newHeldBalance = wallet.heldBalance;
        
        if (previousHighBids.length > 0 && previousHighBids[0].bidderId === req.dbUser.id) {
           const prevBid = previousHighBids[0].amount;
           amountToDeduct = listing.buyNowPrice - prevBid;
           newHeldBalance = Math.max(0, wallet.heldBalance - prevBid);
        }
        newAvailableBalance = newAvailableBalance - amountToDeduct;

        await tx.update(wallets).set({ availableBalance: newAvailableBalance, heldBalance: newHeldBalance }).where(eq(wallets.id, wallet.id));
        
        const transactionId = generateId('txn');
        await tx.insert(walletTransactions).values({
          id: generateId('wtx'), walletId: wallet.id, userId: req.dbUser.id, type: 'AUCTION_PAYMENT',
          amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: wallet.availableBalance, balanceAfter: newAvailableBalance,
          referenceType: 'transactions', referenceId: transactionId,
          description: \`Payment for Buy Now on \${listing.title}\`
        });

        // Add 100% of price to seller wallet
        let sellerWallet = await tx.select().from(wallets).where(eq(wallets.userId, listing.sellerId)).then(r => r[0]);
        if (sellerWallet) {
           const newSellerBal = sellerWallet.availableBalance + listing.buyNowPrice;
           await tx.update(wallets).set({ availableBalance: newSellerBal }).where(eq(wallets.id, sellerWallet.id));
           await tx.insert(walletTransactions).values({
             id: generateId('wtx'), walletId: sellerWallet.id, userId: listing.sellerId, type: 'AUCTION_PAYMENT',
             amount: listing.buyNowPrice, status: 'SUCCESS', balanceBefore: sellerWallet.availableBalance, balanceAfter: newSellerBal,
             referenceType: 'transactions', referenceId: transactionId,
             description: \`Received payment for sold item \${listing.title}\`
           });
        }
        
        `;

code = code.replace(regex, newLogic);
fs.writeFileSync('server.ts', code);
