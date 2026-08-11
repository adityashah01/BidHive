const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "<ListingDetail\n              listing={selectedListing}",
  "<ListingDetail\n              walletInfo={walletInfo}\n              listing={selectedListing}"
);

code = code.replace(
  "<ListingDetail\n                listing={selectedListing}",
  "<ListingDetail\n                walletInfo={walletInfo}\n                listing={selectedListing}"
);

fs.writeFileSync('src/App.tsx', code);
