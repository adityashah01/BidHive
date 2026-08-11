import { db } from './index.ts';
import { categories, users, listings, bids, reviews, notifications, reports, transactions } from './schema.ts';
import { INITIAL_CATEGORIES, INITIAL_USERS, INITIAL_LISTINGS, INITIAL_BIDS, INITIAL_REVIEWS, INITIAL_NOTIFICATIONS, INITIAL_REPORTS } from '../data.ts';
import { ne } from 'drizzle-orm';

export async function makeAllListingsLive() {
  try {
    const futureEndTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days in the future
    await db.update(listings)
      .set({
        status: 'ACTIVE',
        endTime: futureEndTime
      })
      .where(ne(listings.status, 'DELETED'));
    console.log('[DB] All auction products updated to ACTIVE live status!');
  } catch (err: any) {
    console.warn('[DB] Warning making all listings live:', err?.message || err);
  }
}

export async function seedDatabase() {
  try {
    // Check if seeded already
    const categoryCount = await db.select().from(categories);
    if (categoryCount.length === 0) {
      console.log('Seeding categories...');
      await db.insert(categories).values(INITIAL_CATEGORIES);
    } else {
      console.log('Categories already exist. Merging missing ones...');
      for (const cat of INITIAL_CATEGORIES) {
        await db.insert(categories).values(cat).onConflictDoNothing();
      }
    }

    console.log('Seeding users...');
    for (const u of INITIAL_USERS) {
      const dbRole = u.role === 'ADMIN' ? 'ADMIN' : (u.id === 'usr-pemba' ? 'SELLER' : 'BIDDER');
      await db.insert(users).values({
        id: u.id,
        uid: u.id, // For initial mock data, use id as uid
        name: u.name,
        email: u.email,
        role: dbRole as any,
        sellerRating: u.sellerRating,
        sellerRatingCount: u.sellerRatingCount,
        buyerReliabilityScore: u.buyerReliabilityScore,
        isBanned: u.isBanned,
        avatar: u.avatar,
      }).onConflictDoNothing();
    }

    console.log('Seeding listings...');
    for (const l of INITIAL_LISTINGS) {
      // Create listing
      await db.insert(listings).values({
        id: l.id,
        sellerId: l.sellerId,
        sellerName: l.sellerName,
        title: l.title,
        description: l.description,
        categoryId: l.categoryId,
        condition: l.condition as any,
        startingPrice: l.startingPrice,
        reservePrice: l.reservePrice,
        buyNowPrice: l.buyNowPrice,
        currentPrice: l.currentPrice,
        startTime: new Date(l.startTime),
        endTime: new Date(l.endTime),
        status: l.status as any,
        viewCount: l.viewCount,
        images: l.images,
        createdAt: new Date(l.createdAt),
      }).onConflictDoNothing();
    }

    console.log('Seeding bids...');
    for (const b of INITIAL_BIDS) {
      await db.insert(bids).values({
        id: b.id,
        listingId: b.listingId,
        bidderId: b.bidderId,
        bidderName: b.bidderName,
        amount: b.amount,
        isAutoBid: b.isAutoBid,
        placedAt: new Date(b.placedAt),
      }).onConflictDoNothing();
    }

    console.log('Seeding transactions...');
    const INITIAL_TRANSACTIONS = [
      {
        id: 'txn-camera',
        listingId: 'lst-camera',
        listingTitle: 'Fujifilm X-T30 Mirrorless Camera with 18-55mm Kit Lens',
        buyerId: 'usr-nischal',
        buyerName: 'Nischal Basnet',
        sellerId: 'usr-aditya',
        sellerName: 'Aditya Sharma',
        finalAmount: 98000,
        paymentMethod: 'ESEWA' as const,
        paymentStatus: 'PAID' as const,
        paymentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        id: 'txn-past-1',
        listingId: 'lst-gear',
        listingTitle: 'Everest Expedition Trekking Down Jacket & Sleeping Bag Bundle',
        buyerId: 'usr-aditya',
        buyerName: 'Aditya Sharma',
        sellerId: 'usr-pemba',
        sellerName: 'Pemba Sherpa',
        finalAmount: 21500,
        paymentMethod: 'KHALTI' as const,
        paymentStatus: 'PAID' as const,
        paymentDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      }
    ];

    for (const t of INITIAL_TRANSACTIONS) {
      await db.insert(transactions).values(t).onConflictDoNothing();
    }

    console.log('Seeding reviews...');
    for (const r of INITIAL_REVIEWS) {
      // Need a placeholder transaction since transactions aren't explicitly seeded in data.ts but referenced
      // Let's make sure the transaction table has it if referenced
      // For now, let's just skip if not found or insert a dummy transaction if necessary
      // Wait, let's create a transaction record if needed
      await db.insert(reviews).values({
        id: r.id,
        transactionId: r.transactionId,
        reviewerId: r.reviewerId,
        reviewerName: r.reviewerName,
        revieweeId: r.revieweeId,
        rating: r.rating,
        comment: r.comment,
        createdAt: new Date(r.createdAt),
      }).onConflictDoNothing();
    }

    console.log('Seeding notifications...');
    for (const n of INITIAL_NOTIFICATIONS) {
      await db.insert(notifications).values({
        id: n.id,
        userId: n.userId,
        type: n.type as any,
        message: n.message,
        isRead: n.isRead,
        link: n.link,
        createdAt: new Date(n.createdAt),
      }).onConflictDoNothing();
    }

    console.log('Seeding reports...');
    for (const rep of INITIAL_REPORTS) {
      await db.insert(reports).values({
        id: rep.id,
        reporterId: rep.reporterId,
        reporterName: rep.reporterName,
        listingId: rep.listingId,
        listingTitle: rep.listingTitle,
        reason: rep.reason,
        status: rep.status as any,
        createdAt: new Date(rep.createdAt),
      }).onConflictDoNothing();
    }

    console.log('Ensuring all listings are active and live...');
    await makeAllListingsLive();

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
}
