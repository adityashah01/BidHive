import fs from 'fs';
let server = fs.readFileSync('server.ts', 'utf-8');

// Location selection is not saved: CreateListingForm sends it, but listing insert ignores it.
const insertLoc = "const newListing = await tx.insert(listings).values({";
const fixedInsertLoc = `const newListing = await tx.insert(listings).values({
          locationName,`;

if (server.includes(insertLoc) && !server.includes("locationName,")) {
  server = server.replace(insertLoc, fixedInsertLoc);
}

fs.writeFileSync('server.ts', server);
