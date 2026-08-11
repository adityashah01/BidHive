import fs from 'fs';
let schema = fs.readFileSync('src/db/schema.ts', 'utf-8');

if (!schema.includes('import { check }')) {
  schema = schema.replace("import { customType } from 'drizzle-orm/pg-core';", "import { customType, check } from 'drizzle-orm/pg-core';\nimport { sql } from 'drizzle-orm';");
}

// Check constraint for listings
// startingPrice > 0, reservePrice >= startingPrice
if (!schema.includes("check('price_check'")) {
  schema = schema.replace(
    /export const listings = pgTable\('listings', \{([\s\S]*?)\}\);/g,
    `export const listings = pgTable('listings', {$1}, (table) => {
  return {
    price_check: check('price_check', sql\`"starting_price" > 0 AND ("reserve_price" IS NULL OR "reserve_price" >= "starting_price")\`),
    dates_check: check('dates_check', sql\`"end_time" > "start_time"\`)
  };
});`
  );
}

// Check constraint for wallets availableBalance >= 0, heldBalance >= 0
if (!schema.includes("check('balance_check'")) {
  schema = schema.replace(
    /export const wallets = pgTable\('wallets', \{([\s\S]*?)\}\);/g,
    `export const wallets = pgTable('wallets', {$1}, (table) => {
  return {
    balance_check: check('balance_check', sql\`"available_balance" >= 0 AND "held_balance" >= 0\`)
  };
});`
  );
}

// Check constraint for bids amount > 0
if (!schema.includes("check('bid_amount_check'")) {
  schema = schema.replace(
    /export const bids = pgTable\('bids', \{([\s\S]*?)\}\);/g,
    `export const bids = pgTable('bids', {$1}, (table) => {
  return {
    bid_amount_check: check('bid_amount_check', sql\`"amount" > 0\`)
  };
});`
  );
}

fs.writeFileSync('src/db/schema.ts', schema);
