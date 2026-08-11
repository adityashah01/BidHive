const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

if (!code.includes('import AdminWalletPanel')) {
  code = code.replace("import React, { useState, useEffect } from 'react';", "import React, { useState, useEffect } from 'react';\nimport AdminWalletPanel from './AdminWalletPanel';");
}
fs.writeFileSync('src/components/AdminPanel.tsx', code);
