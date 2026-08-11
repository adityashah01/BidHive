const fs = require('fs');

const fixFile = (path) => {
  let content = fs.readFileSync(path, 'utf8');
  content = content.replace(/\\`/g, '`');
  fs.writeFileSync(path, content);
};

fixFile('src/components/AddMoneyModal.tsx');
fixFile('src/components/AdminWalletPanel.tsx');
fixFile('src/components/WalletPage.tsx');

