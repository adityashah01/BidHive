import fs from 'fs';
let content = fs.readFileSync('src/db/schema.ts', 'utf-8');

// Replace doublePrecision with numeric('col', { precision: 14, scale: 2 })
// But wait, the drizzle syntax is numeric('name', { precision: 14, scale: 2 })
// Let's replace the import first
if (!content.includes("numeric")) {
    content = content.replace("doublePrecision", "numeric, doublePrecision");
}

const replaceNumeric = (colName: string, dbName: string) => {
    const search = `doublePrecision('${dbName}')`;
    const replace = `numeric('${dbName}', { precision: 14, scale: 2 })`;
    content = content.replace(search, replace);
}

replaceNumeric('sellerRating', 'seller_rating');
replaceNumeric('startingPrice', 'starting_price');
replaceNumeric('reservePrice', 'reserve_price');
replaceNumeric('buyNowPrice', 'buy_now_price');
replaceNumeric('currentPrice', 'current_price');
replaceNumeric('latitude', 'latitude'); // Wait, latitude should probably stay doublePrecision, or numeric is fine? numeric(14,2) is not enough for lat/long! Actually, let's keep lat/long doublePrecision.
// Oh wait, lat/long: 
// replaceNumeric('latitude', 'latitude') <- let's NOT do this.

// Let's just do a regex replace for money fields.
// find: doublePrecision('amount') -> numeric('amount', { precision: 14, scale: 2 })
// money fields: starting_price, reserve_price, buy_now_price, current_price, amount, max_amount, final_amount, balance, total_amount, held_balance, available_balance, balance_before, balance_after, commission_amount, seller_net_amount, requested_amount, approved_amount

const fieldsToChange = [
    'starting_price', 'reserve_price', 'buy_now_price', 'current_price', 
    'amount', 'max_amount', 'final_amount', 'total_amount', 'held_balance', 
    'available_balance', 'balance_before', 'balance_after', 'commission_amount', 
    'seller_net_amount', 'requested_amount', 'approved_amount',
    'total_balance', 'locked_balance' // depending on what's there
];

for (const field of fieldsToChange) {
    content = content.replace(new RegExp(`doublePrecision\\('${field}'\\)`, 'g'), `numeric('${field}', { precision: 14, scale: 2 })`);
}

fs.writeFileSync('src/db/schema.ts', content);
