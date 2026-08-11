CREATE TABLE "topup_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"wallet_id" text NOT NULL,
	"requested_amount" numeric(14, 2) NOT NULL,
	"approved_amount" numeric(14, 2),
	"currency" text DEFAULT 'NPR' NOT NULL,
	"payment_method" text NOT NULL,
	"payment_reference" text,
	"payment_screenshot_url" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" text,
	"admin_note" text,
	"rejection_reason" text,
	"wallet_transaction_id" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "topup_requests_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "auto_bid_configs" ALTER COLUMN "max_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "bids" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "starting_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "reserve_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "buy_now_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "current_price" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "latitude" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "payment_screenshots" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "transactions" ALTER COLUMN "final_amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "seller_rating" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "seller_rating" SET DEFAULT 5;--> statement-breakpoint
ALTER TABLE "wallet_holds" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallet_topups" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "amount" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "balance_before" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallet_transactions" ALTER COLUMN "balance_after" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "available_balance" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "wallets" ALTER COLUMN "held_balance" SET DATA TYPE numeric(14, 2);--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deleted_by" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deletion_reason" text;--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topup_requests" ADD CONSTRAINT "topup_requests_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;