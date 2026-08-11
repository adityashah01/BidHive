import { db } from '../db/index.ts';
import {
  listings,
  bids,
  users,
  transactions,
  notifications,
  emailOutbox,
  wallets,
  walletHolds,
  walletTransactions,
  auditLogs,
} from '../db/schema.ts';
import { eq, and, desc, lt, sql } from 'drizzle-orm';
import {
  generateWinnerEmail,
  generateSellerEmail,
  generateLosingBidderEmail,
  generateReserveNotMetEmail,
} from './emailTemplates.ts';
import { processEmailOutbox } from './emailWorker.ts';
import crypto from 'crypto';

const generateId = (prefix: string) => `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;

export interface SettlementResult {
  status: 'SETTLED_SOLD' | 'SETTLED_ENDED' | 'SKIPPED' | 'ERROR';
  listingId: string;
  reason?: string;
  winnerId?: string;
  finalAmount?: number;
}

export async function settleAuction(listingId: string, pusherGetter?: () => any): Promise<SettlementResult> {
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  let postCommitAction: (() => Promise<void>) | null = null;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Lock listing row using FOR UPDATE
      const listingRows = await tx
        .select()
        .from(listings)
        .where(eq(listings.id, listingId))
        .for('update');

      if (listingRows.length === 0) {
        return { status: 'SKIPPED', listingId, reason: 'Listing not found' } as SettlementResult;
      }

      const listing = listingRows[0];

      // 2. Confirm listing is still ACTIVE
      if (listing.status !== 'ACTIVE') {
        return { status: 'SKIPPED', listingId, reason: `Listing status is ${listing.status}` } as SettlementResult;
      }

      // 3. Confirm end time has passed
      const now = new Date();
      if (new Date(listing.endTime) > now) {
        return { status: 'SKIPPED', listingId, reason: 'Listing end time has not passed' } as SettlementResult;
      }

      // 4. Find highest valid bid
      const highestBid = await tx
        .select()
        .from(bids)
        .where(eq(bids.listingId, listing.id))
        .orderBy(desc(bids.amount))
        .limit(1)
        .then((r) => r[0]);

      // 5. Fetch seller
      const seller = await tx
        .select()
        .from(users)
        .where(eq(users.id, listing.sellerId))
        .then((r) => r[0]);

      // Check reserve price
      const reserveMet = highestBid && (!listing.reservePrice || Number(highestBid.amount) >= Number(listing.reservePrice));

      if (highestBid && reserveMet) {
        // ==========================================
        // VALID WINNER FLOW
        // ==========================================
        const winningAmount = Number(highestBid.amount);

        // Update listing status to SOLD
        await tx
          .update(listings)
          .set({ status: 'SOLD', currentPrice: winningAmount })
          .where(eq(listings.id, listing.id));

        // Winner user details
        const winner = await tx
          .select()
          .from(users)
          .where(eq(users.id, highestBid.bidderId))
          .then((r) => r[0]);

        // Capture Winner's Wallet Hold
        const winnerActiveHolds = await tx
          .select()
          .from(walletHolds)
          .where(
            and(
              eq(walletHolds.listingId, listing.id),
              eq(walletHolds.userId, highestBid.bidderId),
              eq(walletHolds.status, 'ACTIVE')
            )
          )
          .for('update');

        for (const hold of winnerActiveHolds) {
          const holdAmount = Number(hold.amount);
          // Get winner wallet
          const winnerWallet = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, highestBid.bidderId))
            .for('update')
            .then((r) => r[0]);

          if (winnerWallet) {
            const newHeldBalance = Math.max(0, Number(winnerWallet.heldBalance) - holdAmount);
            await tx
              .update(wallets)
              .set({ heldBalance: newHeldBalance, updatedAt: new Date() })
              .where(eq(wallets.id, winnerWallet.id));

            await tx.insert(walletTransactions).values({
              id: generateId('wtx'),
              walletId: winnerWallet.id,
              userId: highestBid.bidderId,
              type: 'AUCTION_PAYMENT',
              amount: holdAmount,
              status: 'SUCCESS',
              description: `Captured wallet hold for winning auction "${listing.title}"`,
              referenceType: 'listings',
              referenceId: listing.id,
              balanceBefore: Number(winnerWallet.availableBalance),
              balanceAfter: Number(winnerWallet.availableBalance),
            });
          }

          await tx
            .update(walletHolds)
            .set({ status: 'CAPTURED', updatedAt: new Date() })
            .where(eq(walletHolds.id, hold.id));
        }

        // Release Losing Bidders' Wallet Holds
        const losingActiveHolds = await tx
          .select()
          .from(walletHolds)
          .where(
            and(
              eq(walletHolds.listingId, listing.id),
              eq(walletHolds.status, 'ACTIVE'),
              sql`${walletHolds.userId} != ${highestBid.bidderId}`
            )
          )
          .for('update');

        for (const hold of losingActiveHolds) {
          const holdAmount = Number(hold.amount);
          const losingWallet = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, hold.userId))
            .for('update')
            .then((r) => r[0]);

          if (losingWallet) {
            const newAvailable = Number(losingWallet.availableBalance) + holdAmount;
            const newHeld = Math.max(0, Number(losingWallet.heldBalance) - holdAmount);

            await tx
              .update(wallets)
              .set({ availableBalance: newAvailable, heldBalance: newHeld, updatedAt: new Date() })
              .where(eq(wallets.id, losingWallet.id));

            await tx.insert(walletTransactions).values({
              id: generateId('wtx'),
              walletId: losingWallet.id,
              userId: hold.userId,
              type: 'BID_RELEASE',
              amount: holdAmount,
              status: 'SUCCESS',
              description: `Released held balance for outbid on "${listing.title}"`,
              referenceType: 'listings',
              referenceId: listing.id,
              balanceBefore: Number(losingWallet.availableBalance),
              balanceAfter: newAvailable,
            });
          }

          await tx
            .update(walletHolds)
            .set({ status: 'RELEASED', updatedAt: new Date() })
            .where(eq(walletHolds.id, hold.id));

          // Insert losing bidder notification
          const losingKey = `AUCTION_LOST:${listing.id}:${hold.userId}`;
          await tx
            .insert(notifications)
            .values({
              id: generateId('not'),
              userId: hold.userId,
              type: 'AUCTION_LOST',
              title: 'Auction Ended',
              message: `The auction for "${listing.title}" has ended. Your held balance of Rs. ${holdAmount.toLocaleString()} was released.`,
              isRead: false,
              link: listing.id,
              listingId: listing.id,
              deduplicationKey: losingKey,
            })
            .onConflictDoNothing();

          // Queue losing bidder email
          const losingUser = await tx
            .select()
            .from(users)
            .where(eq(users.id, hold.userId))
            .then((r) => r[0]);

          if (losingUser && losingUser.email) {
            const tmpl = generateLosingBidderEmail({
              bidderName: losingUser.name,
              productTitle: listing.title,
              finalAmount: winningAmount,
              listingId: listing.id,
              appUrl,
            });

            await tx
              .insert(emailOutbox)
              .values({
                id: generateId('emb'),
                userId: losingUser.id,
                recipientEmail: losingUser.email,
                emailType: 'AUCTION_LOST',
                listingId: listing.id,
                subject: tmpl.subject,
                htmlContent: tmpl.htmlContent,
                textContent: tmpl.textContent,
                deduplicationKey: losingKey,
                status: 'PENDING',
              })
              .onConflictDoNothing();
          }
        }

        // Credit Seller Wallet
        let sellerWallet = await tx
          .select()
          .from(wallets)
          .where(eq(wallets.userId, listing.sellerId))
          .for('update')
          .then((r) => r[0]);

        if (!sellerWallet) {
          const [newW] = await tx
            .insert(wallets)
            .values({
              id: generateId('wal'),
              userId: listing.sellerId,
              availableBalance: 0,
              heldBalance: 0,
              currency: 'NPR',
            })
            .returning();
          sellerWallet = newW;
        }

        const sellerNewAvailable = Number(sellerWallet.availableBalance) + winningAmount;
        await tx
          .update(wallets)
          .set({ availableBalance: sellerNewAvailable, updatedAt: new Date() })
          .where(eq(wallets.id, sellerWallet.id));

        await tx.insert(walletTransactions).values({
          id: generateId('wtx'),
          walletId: sellerWallet.id,
          userId: listing.sellerId,
          type: 'AUCTION_PAYMENT',
          amount: winningAmount,
          status: 'SUCCESS',
          description: `Received payment for completed auction "${listing.title}"`,
          referenceType: 'listings',
          referenceId: listing.id,
          balanceBefore: Number(sellerWallet.availableBalance),
          balanceAfter: sellerNewAvailable,
        });

        // Create Sale Transaction record
        const txnId = generateId('txn');
        const deadline = new Date();
        deadline.setHours(deadline.getHours() + 48);

        await tx.insert(transactions).values({
          id: txnId,
          listingId: listing.id,
          listingTitle: listing.title,
          buyerId: highestBid.bidderId,
          buyerName: highestBid.bidderName,
          sellerId: listing.sellerId,
          sellerName: listing.sellerName,
          finalAmount: winningAmount,
          paymentStatus: 'PAID',
          paymentDeadline: deadline,
          completedAt: new Date(),
        });

        // Winner Notification
        const winnerNotKey = `AUCTION_WON:${listing.id}:${highestBid.bidderId}`;
        await tx
          .insert(notifications)
          .values({
            id: generateId('not'),
            userId: highestBid.bidderId,
            type: 'AUCTION_WON',
            title: 'Congratulations! You won the auction',
            message: `You won "${listing.title}" for Rs. ${winningAmount.toLocaleString()}.`,
            isRead: false,
            link: listing.id,
            listingId: listing.id,
            transactionId: txnId,
            deduplicationKey: winnerNotKey,
          })
          .onConflictDoNothing();

        // Seller Notification
        const sellerNotKey = `LISTING_SOLD:${listing.id}:${listing.sellerId}`;
        await tx
          .insert(notifications)
          .values({
            id: generateId('not'),
            userId: listing.sellerId,
            type: 'LISTING_SOLD',
            title: 'Your listing has been won',
            message: `Your listing "${listing.title}" was won by ${highestBid.bidderName} for Rs. ${winningAmount.toLocaleString()}.`,
            isRead: false,
            link: listing.id,
            listingId: listing.id,
            transactionId: txnId,
            deduplicationKey: sellerNotKey,
          })
          .onConflictDoNothing();

        // Winner Email Outbox
        if (winner && winner.email) {
          const winnerTmpl = generateWinnerEmail({
            winnerName: winner.name,
            productTitle: listing.title,
            finalAmount: winningAmount,
            endTime: listing.endTime.toISOString(),
            listingId: listing.id,
            appUrl,
          });

          await tx
            .insert(emailOutbox)
            .values({
              id: generateId('emb'),
              userId: winner.id,
              recipientEmail: winner.email,
              emailType: 'AUCTION_WON',
              listingId: listing.id,
              subject: winnerTmpl.subject,
              htmlContent: winnerTmpl.htmlContent,
              textContent: winnerTmpl.textContent,
              deduplicationKey: winnerNotKey,
              status: 'PENDING',
            })
            .onConflictDoNothing();
        }

        // Seller Email Outbox
        if (seller && seller.email) {
          const sellerTmpl = generateSellerEmail({
            sellerName: seller.name,
            productTitle: listing.title,
            finalAmount: winningAmount,
            winnerName: highestBid.bidderName,
            listingId: listing.id,
            appUrl,
          });

          await tx
            .insert(emailOutbox)
            .values({
              id: generateId('emb'),
              userId: seller.id,
              recipientEmail: seller.email,
              emailType: 'LISTING_SOLD',
              listingId: listing.id,
              subject: sellerTmpl.subject,
              htmlContent: sellerTmpl.htmlContent,
              textContent: sellerTmpl.textContent,
              deduplicationKey: sellerNotKey,
              status: 'PENDING',
            })
            .onConflictDoNothing();
        }

        // Audit Log
        await tx.insert(auditLogs).values({
          id: generateId('aud'),
          action: 'AUCTION_CONCLUDED_SOLD',
          userId: null,
          userName: 'SYSTEM',
          details: `Auction "${listing.title}" (ID: ${listing.id}) naturally concluded. Won by ${highestBid.bidderName} for Rs. ${winningAmount.toLocaleString()}.`,
        });

        // Set up post-commit actions (Pusher & Email Worker)
        postCommitAction = async () => {
          if (pusherGetter) {
            try {
              const pusher = pusherGetter();
              if (pusher) {
                // Private channel to winner
                pusher.trigger(`private-user-${highestBid.bidderId}`, 'auction-won', {
                  listingId: listing.id,
                  title: listing.title,
                  finalAmount: winningAmount,
                  message: `Congratulations! You won ${listing.title} for Rs. ${winningAmount.toLocaleString()}.`,
                });

                // Private channel to seller
                pusher.trigger(`private-user-${listing.sellerId}`, 'listing-sold', {
                  listingId: listing.id,
                  title: listing.title,
                  finalAmount: winningAmount,
                  message: `Your listing ${listing.title} sold for Rs. ${winningAmount.toLocaleString()}.`,
                });

                // General channel update
                pusher.trigger(`listing-${listing.id}`, 'status-changed', {
                  listing: { ...listing, status: 'SOLD', currentPrice: winningAmount },
                });
              }
            } catch (pErr: any) {
              console.error('[PUSHER TRIGGER ERROR]', pErr.message);
            }
          }

          // Trigger email worker asynchronously
          processEmailOutbox().catch((e) => console.error('[EMAIL WORKER TRIGGER ERROR]', e.message));
        };

        return {
          status: 'SETTLED_SOLD',
          listingId: listing.id,
          winnerId: highestBid.bidderId,
          finalAmount: winningAmount,
        } as SettlementResult;
      } else {
        // ==========================================
        // RESERVE NOT MET OR NO BIDS FLOW
        // ==========================================
        await tx
          .update(listings)
          .set({ status: 'ENDED' })
          .where(eq(listings.id, listing.id));

        // Release ALL active wallet holds for this listing
        const allActiveHolds = await tx
          .select()
          .from(walletHolds)
          .where(and(eq(walletHolds.listingId, listing.id), eq(walletHolds.status, 'ACTIVE')))
          .for('update');

        for (const hold of allActiveHolds) {
          const holdAmount = Number(hold.amount);
          const bidderWallet = await tx
            .select()
            .from(wallets)
            .where(eq(wallets.userId, hold.userId))
            .for('update')
            .then((r) => r[0]);

          if (bidderWallet) {
            const newAvail = Number(bidderWallet.availableBalance) + holdAmount;
            const newHeld = Math.max(0, Number(bidderWallet.heldBalance) - holdAmount);

            await tx
              .update(wallets)
              .set({ availableBalance: newAvail, heldBalance: newHeld, updatedAt: new Date() })
              .where(eq(wallets.id, bidderWallet.id));

            await tx.insert(walletTransactions).values({
              id: generateId('wtx'),
              walletId: bidderWallet.id,
              userId: hold.userId,
              type: 'BID_RELEASE',
              amount: holdAmount,
              status: 'SUCCESS',
              description: `Released held balance for ended auction "${listing.title}"`,
              referenceType: 'listings',
              referenceId: listing.id,
              balanceBefore: Number(bidderWallet.availableBalance),
              balanceAfter: newAvail,
            });
          }

          await tx
            .update(walletHolds)
            .set({ status: 'RELEASED', updatedAt: new Date() })
            .where(eq(walletHolds.id, hold.id));

          const losingKey = `AUCTION_LOST:${listing.id}:${hold.userId}`;
          await tx
            .insert(notifications)
            .values({
              id: generateId('not'),
              userId: hold.userId,
              type: 'AUCTION_LOST',
              title: 'Auction Ended',
              message: `The auction for "${listing.title}" ended without a winner. Your held balance of Rs. ${holdAmount.toLocaleString()} was released.`,
              isRead: false,
              link: listing.id,
              listingId: listing.id,
              deduplicationKey: losingKey,
            })
            .onConflictDoNothing();
        }

        // Seller Notification & Email
        const sellerKey = `RESERVE_NOT_MET:${listing.id}:${listing.sellerId}`;
        const sellerMsg = highestBid
          ? `Your auction for "${listing.title}" ended without meeting reserve price (Highest bid: Rs. ${Number(highestBid.amount).toLocaleString()}).`
          : `Your auction for "${listing.title}" ended with no bids.`;

        await tx
          .insert(notifications)
          .values({
            id: generateId('not'),
            userId: listing.sellerId,
            type: 'RESERVE_NOT_MET',
            title: 'Your auction ended without a winner',
            message: sellerMsg,
            isRead: false,
            link: listing.id,
            listingId: listing.id,
            deduplicationKey: sellerKey,
          })
          .onConflictDoNothing();

        if (seller && seller.email) {
          const sellerTmpl = generateReserveNotMetEmail({
            sellerName: seller.name,
            productTitle: listing.title,
            highestBidAmount: highestBid ? Number(highestBid.amount) : 0,
            reservePrice: listing.reservePrice ? Number(listing.reservePrice) : undefined,
            listingId: listing.id,
            appUrl,
          });

          await tx
            .insert(emailOutbox)
            .values({
              id: generateId('emb'),
              userId: seller.id,
              recipientEmail: seller.email,
              emailType: 'RESERVE_NOT_MET',
              listingId: listing.id,
              subject: sellerTmpl.subject,
              htmlContent: sellerTmpl.htmlContent,
              textContent: sellerTmpl.textContent,
              deduplicationKey: sellerKey,
              status: 'PENDING',
            })
            .onConflictDoNothing();
        }

        // Audit Log
        await tx.insert(auditLogs).values({
          id: generateId('aud'),
          action: 'AUCTION_CONCLUDED_ENDED',
          userId: null,
          userName: 'SYSTEM',
          details: `Auction "${listing.title}" (ID: ${listing.id}) ended without a winner.`,
        });

        postCommitAction = async () => {
          if (pusherGetter) {
            try {
              const pusher = pusherGetter();
              if (pusher) {
                pusher.trigger(`private-user-${listing.sellerId}`, 'notification-created', {
                  listingId: listing.id,
                  title: 'Auction Ended',
                  message: sellerMsg,
                });

                pusher.trigger(`listing-${listing.id}`, 'status-changed', {
                  listing: { ...listing, status: 'ENDED' },
                });
              }
            } catch (pErr: any) {
              console.error('[PUSHER TRIGGER ERROR]', pErr.message);
            }
          }

          processEmailOutbox().catch((e) => console.error('[EMAIL WORKER TRIGGER ERROR]', e.message));
        };

        return {
          status: 'SETTLED_ENDED',
          listingId: listing.id,
          reason: highestBid ? 'Reserve price not met' : 'No bids placed',
        } as SettlementResult;
      }
    });

    // Execute post-commit actions if transaction committed successfully
    if (postCommitAction) {
      await postCommitAction();
    }

    return result;
  } catch (error: any) {
    console.error(`[SETTLEMENT ERROR] Failed to settle listing ${listingId}:`, error.message);
    return {
      status: 'ERROR',
      listingId,
      reason: error.message,
    };
  }
}

export async function processAllExpiredAuctions(pusherGetter?: () => any) {
  try {
    const now = new Date();
    // Select all ACTIVE listings whose endTime has passed
    const expiredListings = await db
      .select({ id: listings.id })
      .from(listings)
      .where(and(eq(listings.status, 'ACTIVE'), lt(listings.endTime, now)));

    const results: SettlementResult[] = [];
    for (const item of expiredListings) {
      const res = await settleAuction(item.id, pusherGetter);
      results.push(res);
    }
    return results;
  } catch (err: any) {
    console.error('[CRON SCHEDULER ERROR] Failed to query expired listings:', err.message);
    return [];
  }
}
