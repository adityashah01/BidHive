ALTER TABLE "bids" ADD CONSTRAINT "bid_amount_check" CHECK ("amount" > 0);--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "price_check" CHECK ("starting_price" > 0 AND ("reserve_price" IS NULL OR "reserve_price" >= "starting_price"));--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "dates_check" CHECK ("end_time" > "start_time");--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "balance_check" CHECK ("available_balance" >= 0 AND "held_balance" >= 0);