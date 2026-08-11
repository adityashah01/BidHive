import fs from 'fs';
let types = fs.readFileSync('src/types.ts', 'utf-8');

// Wallet types mismatch: types.ts names wallet fields differently
// Schema uses availableBalance, heldBalance
// Let's check what types.ts uses
if (!types.includes("export type ListingStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'ENDED' | 'CANCELLED' | 'DELETED';")) {
  types = types.replace(
    /export type ListingStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'ENDED' | 'CANCELLED';/g,
    "export type ListingStatus = 'ACTIVE' | 'PENDING' | 'REJECTED' | 'SOLD' | 'ENDED' | 'CANCELLED' | 'DELETED';"
  );
}

// Wallet types
// Schema has availableBalance and heldBalance
types = types.replace(/balance:/g, 'availableBalance:');
types = types.replace(/heldAmount:/g, 'heldBalance:');

fs.writeFileSync('src/types.ts', types);
