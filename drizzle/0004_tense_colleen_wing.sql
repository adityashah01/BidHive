ALTER TABLE "auto_bid_configs" ALTER COLUMN "max_amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "bids" ALTER COLUMN "amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "starting_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "reserve_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "buy_now_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "current_price" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "latitude" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "payment_screenshots" ALTER COLUMN "amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "topup_requests" ALTER COLUMN "requested_amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "topup_requests" ALTER COLUMN "approved_amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "final_amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "seller_rating" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "seller_rating" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "wallet_holds" ALTER COLUMN "amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "balance_before" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "balance_after" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "available_balance" SET DATA TYPE numeric(14,2);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "held_balance" SET DATA TYPE numeric(14,2);