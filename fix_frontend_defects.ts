import fs from 'fs';

// 1. App.tsx:362 forces ACTIVE even though the form prepares PENDING
let app = fs.readFileSync('src/App.tsx', 'utf-8');
app = app.replace(
  "const [newListing, createdStatus] = await api.createListing({ ...formData, status: 'ACTIVE' });",
  "const [newListing, createdStatus] = await api.createListing(formData);"
);

// 2. Escaped conditional class strings
let addMoney = fs.readFileSync('src/components/AddMoneyModal.tsx', 'utf-8');
addMoney = addMoney.replace(/className="[^"]*\\\$\{[^}]+\}[^"]*"/g, (match) => {
  // Replace `className="w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all \${...}"`
  // with className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${...}`}
  let fixed = match.replace(/className="/, 'className={`');
  fixed = fixed.replace(/"$/, '`}');
  fixed = fixed.replace(/\\\$\{(.*?)\}/g, '${$1}');
  return fixed;
});
fs.writeFileSync('src/components/AddMoneyModal.tsx', addMoney);

let walletPage = fs.readFileSync('src/components/WalletPage.tsx', 'utf-8');
walletPage = walletPage.replace(/className="[^"]*\\\$\{[^}]+\}[^"]*"/g, (match) => {
  let fixed = match.replace(/className="/, 'className={`');
  fixed = fixed.replace(/"$/, '`}');
  fixed = fixed.replace(/\\\$\{(.*?)\}/g, '${$1}');
  return fixed;
});
fs.writeFileSync('src/components/WalletPage.tsx', walletPage);

let adminWalletPanel = fs.readFileSync('src/components/AdminWalletPanel.tsx', 'utf-8');
adminWalletPanel = adminWalletPanel.replace(/className="[^"]*\\\$\{[^}]+\}[^"]*"/g, (match) => {
  let fixed = match.replace(/className="/, 'className={`');
  fixed = fixed.replace(/"$/, '`}');
  fixed = fixed.replace(/\\\$\{(.*?)\}/g, '${$1}');
  return fixed;
});
fs.writeFileSync('src/components/AdminWalletPanel.tsx', adminWalletPanel);

// Write app.tsx
fs.writeFileSync('src/App.tsx', app);

