const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Add import
if (!code.includes('import AdminWalletPanel')) {
  code = code.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport AdminWalletPanel from './AdminWalletPanel';");
}

// Update ActiveTab type
const tabStateRegex = /const \[activeTab, setActiveTab\] = useState<'DASHBOARD' \| 'USERS' \| 'RECEIPTS' \| 'LOGS'>\('DASHBOARD'\);/;
code = code.replace(tabStateRegex, "const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'USERS' | 'RECEIPTS' | 'WALLET' | 'LOGS'>('DASHBOARD');");

// Update Tabs array
const tabsArrayRegex = /\{ id: 'LOGS', label: 'System Logs' \}/;
code = code.replace(tabsArrayRegex, "{ id: 'WALLET', label: 'Wallet Top-ups' },\n          { id: 'LOGS', label: 'System Logs' }");

// Add WALLET tab content before LOGS
const logsTabRegex = /\{\/\* TAB 4: SYSTEM LOGS & TOOLS \*\/\}/;
code = code.replace(logsTabRegex, `{/* TAB 4: WALLET TOP-UPS */}
      {activeTab === 'WALLET' && (
        <AdminWalletPanel />
      )}

      {/* TAB 5: SYSTEM LOGS & TOOLS */}`);

fs.writeFileSync('src/components/AdminPanel.tsx', code);
