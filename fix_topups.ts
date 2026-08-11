import fs from 'fs';
// 1. Remove from schema
let schema = fs.readFileSync('src/db/schema.ts', 'utf-8');
const oldTableStr = `export const walletTopups = pgTable('wallet_topups', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  paymentMethod: text('payment_method').notNull(),
  transactionId: text('transaction_id'),
  screenshotUrl: text('screenshot_url'),
  status: text('status').$type<'PENDING' | 'APPROVED' | 'REJECTED'>().default('PENDING').notNull(),
  rejectionReason: text('rejection_reason'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});`;
if (schema.includes(oldTableStr)) {
  schema = schema.replace(oldTableStr, "");
} else {
  // Let's just regex remove it
  schema = schema.replace(/export const walletTopups = pgTable\('wallet_topups', \{[\s\S]*?\}\);/g, "");
}
fs.writeFileSync('src/db/schema.ts', schema);

// 2. Remove from server.ts
let server = fs.readFileSync('server.ts', 'utf-8');
server = server.replace(/walletTopups,/g, "");
server = server.replace(/walletTopups/g, "topupRequests");
fs.writeFileSync('server.ts', server);

