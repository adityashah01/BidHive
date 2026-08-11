import { customType, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, boolean, numeric, doublePrecision } from 'drizzle-orm/pg-core';

const money = customType<{ data: number; driverData: string }>({
  dataType() {
    return 'numeric(14,2)';
  },
  toDriver(value: number): string {
    return value.toString();
  },
  fromDriver(value: string): number {
    return Number(value);
  },
});

// 1. Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // We can use the firebase uid directly as id, or standard id
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').$type<'BIDDER' | 'SELLER' | 'ADMIN'>().default('BIDDER').notNull(),
  sellerRating: money('seller_rating').default(5.0).notNull(),
  sellerRatingCount: integer('seller_rating_count').default(0).notNull(),
  buyerReliabilityScore: integer('buyer_reliability_score').default(100).notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  avatar: text('avatar').default('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80').notNull(),
  passwordHash: text('password_hash'),
  phoneNumber: text('phone_number'),
  resetToken: text('reset_token'),
  resetTokenExpiry: timestamp('reset_token_expiry'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false).notNull(),
  twoFactorCode: text('two_factor_code'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  icon: text('icon').notNull(),
});

// 3. Listings table
export const listings = pgTable('listings', {
  id: text('id').primaryKey(),
  sellerId: text('seller_id').references(() => users.id).notNull(),
  sellerName: text('seller_name').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  condition: text('condition').$type<'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR'>().notNull(),
  startingPrice: money('starting_price').notNull(),
  reservePrice: money('reserve_price'), // Hidden from bidders
  buyNowPrice: money('buy_now_price'),
  currentPrice: money('current_price').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  status: text('status').$type<'PENDING' | 'ACTIVE' | 'ENDED' | 'SOLD' | 'CANCELLED' | 'DELETED'>().default('PENDING').notNull(),
  viewCount: integer('view_count').default(0).notNull(),
  images: text('images').array().notNull(), // PostgreSQL array of text
  locationName: text('location_name'),
  latitude: money('latitude'),
  longitude: doublePrecision('longitude'),
  deletedAt: timestamp('deleted_at'),
  deletedBy: text('deleted_by'),
  deletionReason: text('deletion_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    price_check: check('price_check', sql`"starting_price" > 0 AND ("reserve_price" IS NULL OR "reserve_price" >= "starting_price")`),
    dates_check: check('dates_check', sql`"end_time" > "start_time"`)
  };
});

// 4. Bids table
export const bids = pgTable('bids', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  bidderId: text('bidder_id').references(() => users.id).notNull(),
  bidderName: text('bidder_name').notNull(),
  amount: money('amount').notNull(),
  isAutoBid: boolean('is_auto_bid').default(false).notNull(),
  placedAt: timestamp('placed_at').defaultNow().notNull(),
}, (table) => {
  return {
    bid_amount_check: check('bid_amount_check', sql`"amount" > 0`)
  };
});

// 5. Auto Bid Configs table
export const autoBidConfigs = pgTable('auto_bid_configs', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').references(() => listings.id, { onDelete: 'cascade' }).notNull(),
  bidderId: text('bidder_id').references(() => users.id).notNull(),
  maxAmount: money('max_amount').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. Transactions table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  listingId: text('listing_id').references(() => listings.id).notNull(),
  listingTitle: text('listing_title').notNull(),
  buyerId: text('buyer_id').references(() => users.id).notNull(),
  buyerName: text('buyer_name').notNull(),
  sellerId: text('seller_id').references(() => users.id).notNull(),
  sellerName: text('seller_name').notNull(),
  finalAmount: money('final_amount').notNull(),
  paymentMethod: text('payment_method'),
  paymentStatus: text('payment_status').default('PENDING').notNull(),
  paymentDeadline: timestamp('payment_deadline').notNull(),
  paymentScreenshot: text('payment_screenshot'),
  completedAt: timestamp('completed_at'),
});

// 7. Reviews table
export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').references(() => transactions.id).notNull(),
  reviewerId: text('reviewer_id').references(() => users.id).notNull(),
  reviewerName: text('reviewer_name').notNull(),
  revieweeId: text('reviewee_id').references(() => users.id).notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8. Notifications table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  type: text('type').$type<'OUTBID' | 'AUCTION_WON' | 'AUCTION_LOST' | 'LISTING_SOLD' | 'RESERVE_NOT_MET' | 'WALLET_HOLD_RELEASED' | 'AUCTION_ENDED' | 'PAYMENT_RECEIVED' | 'PAYMENT_DEADLINE' | 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'NEW_REVIEW' | 'PRICE_ALERT'>().notNull(),
  title: text('title'),
  message: text('message').notNull(),
  listingId: text('listing_id'),
  transactionId: text('transaction_id'),
  isRead: boolean('is_read').default(false).notNull(),
  link: text('link'),
  deduplicationKey: text('deduplication_key').unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 8b. Email Outbox table
export const emailOutbox = pgTable('email_outbox', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  recipientEmail: text('recipient_email').notNull(),
  emailType: text('email_type').notNull(),
  listingId: text('listing_id').references(() => listings.id, { onDelete: 'set null' }),
  subject: text('subject').notNull(),
  htmlContent: text('html_content').notNull(),
  textContent: text('text_content').notNull(),
  deduplicationKey: text('deduplication_key').unique().notNull(),
  status: text('status').$type<'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED'>().default('PENDING').notNull(),
  attempts: integer('attempts').default(0).notNull(),
  lastError: text('last_error'),
  nextAttemptAt: timestamp('next_attempt_at').defaultNow().notNull(),
  providerMessageId: text('provider_message_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
});

// 9. Reports table
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').references(() => users.id).notNull(),
  reporterName: text('reporter_name').notNull(),
  listingId: text('listing_id').references(() => listings.id).notNull(),
  listingTitle: text('listing_title').notNull(),
  reason: text('reason').notNull(),
  status: text('status').$type<'PENDING' | 'REVIEWED' | 'RESOLVED' | 'DISMISSED'>().default('PENDING').notNull(),
  adminNotes: text('admin_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Sent Emails table
export const sentEmails = pgTable('sent_emails', {
  id: text('id').primaryKey(),
  toEmail: text('to_email').notNull(),
  toName: text('to_name').notNull(),
  subject: text('subject').notNull(),
  bodyHtml: text('body_html').notNull(),
  sentAt: timestamp('sent_at').defaultNow().notNull(),
});

// 11. Audit Logs table
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  action: text('action').notNull(),
  userId: text('user_id'),
  userName: text('user_name'),
  details: text('details').notNull(),
  ipAddress: text('ip_address'),
  deviceInfo: text('device_info'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. Payment Screenshots table
export const paymentScreenshots = pgTable('payment_screenshots', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }).notNull(),
  buyerId: text('buyer_id').references(() => users.id).notNull(),
  buyerName: text('buyer_name').notNull(),
  buyerEmail: text('buyer_email').notNull(),
  amount: money('amount').notNull(),
  screenshotUrl: text('screenshot_url').notNull(),
  paymentMethod: text('payment_method').default('QR_CODE').notNull(),
  status: text('status').$type<'PENDING_REVIEW' | 'DONE' | 'REJECTED'>().default('PENDING_REVIEW').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. Category Follows
export const categoryFollows = pgTable('category_follows', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  categoryId: text('category_id').references(() => categories.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Price Targets & Listing Follows
export const priceTargets = pgTable('price_targets', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  listingId: text('listing_id').references(() => listings.id).notNull(),
  targetPrice: doublePrecision('target_price').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const listingFollows = pgTable('listing_follows', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  listingId: text('listing_id').references(() => listings.id).notNull(),
  targetPriceThreshold: doublePrecision('target_price_threshold'),
  notifyOnOutbid: boolean('notify_on_outbid').default(true).notNull(),
  notifyOnPriceThreshold: boolean('notify_on_price_threshold').default(true).notNull(),
  notifyInApp: boolean('notify_in_app').default(true).notNull(),
  notifyEmail: boolean('notify_email').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. Wallet tables
export const wallets = pgTable('wallets', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull().unique(),
  availableBalance: money('available_balance').default(0).notNull(),
  heldBalance: money('held_balance').default(0).notNull(),
  currency: text('currency').default('NPR').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => {
  return {
    balance_check: check('balance_check', sql`"available_balance" >= 0 AND "held_balance" >= 0`)
  };
});



export const walletTransactions = pgTable('wallet_transactions', {
  id: text('id').primaryKey(),
  walletId: text('wallet_id').references(() => wallets.id).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  type: text('type').$type<'WELCOME_BONUS' | 'BID_HOLD' | 'BID_RELEASE' | 'BID_CAPTURE' | 'TOP_UP' | 'REFUND' | 'ADMIN_CREDIT' | 'ADMIN_DEBIT' | 'AUCTION_PAYMENT' | 'ADMIN_ADJUSTMENT'>().notNull(),
  amount: money('amount').notNull(),
  status: text('status').default('SUCCESS').notNull(),
  description: text('description').notNull(),
  referenceType: text('reference_type'),
  referenceId: text('reference_id'),
  idempotencyKey: text('idempotency_key').unique(),
  balanceBefore: money('balance_before').notNull(),
  balanceAfter: money('balance_after').notNull(),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const walletHolds = pgTable('wallet_holds', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  walletId: text('wallet_id').references(() => wallets.id).notNull(),
  listingId: text('listing_id').references(() => listings.id).notNull(),
  bidId: text('bid_id'),
  amount: money('amount').notNull(),
  status: text('status').$type<'ACTIVE' | 'RELEASED' | 'CAPTURED'>().default('ACTIVE').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  bids: many(bids),
  autoBids: many(autoBidConfigs),
  notifications: many(notifications),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  seller: one(users, {
    fields: [listings.sellerId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [listings.categoryId],
    references: [categories.id],
  }),
  bids: many(bids),
  autoBids: many(autoBidConfigs),
}));

export const bidsRelations = relations(bids, ({ one }) => ({
  listing: one(listings, {
    fields: [bids.listingId],
    references: [listings.id],
  }),
  bidder: one(users, {
    fields: [bids.bidderId],
    references: [users.id],
  }),
}));

export const topupRequests = pgTable('topup_requests', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  walletId: text('wallet_id').references(() => wallets.id).notNull(),
  requestedAmount: money('requested_amount').notNull(),
  approvedAmount: money('approved_amount'),
  currency: text('currency').default('NPR').notNull(),
  paymentMethod: text('payment_method').$type<'QR_PAYMENT' | 'MANUAL_ESEWA' | 'MANUAL_KHALTI' | 'BANK_TRANSFER' | 'ADMIN_ADJUSTMENT'>().notNull(),
  paymentReference: text('payment_reference'),
  paymentScreenshotUrl: text('payment_screenshot_url'),
  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'>().default('PENDING').notNull(),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  adminNote: text('admin_note'),
  rejectionReason: text('rejection_reason'),
  walletTransactionId: text('wallet_transaction_id'),
  idempotencyKey: text('idempotency_key').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
