const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import WalletPage')) {
  code = code.replace("import AdminPanel from './components/AdminPanel';", "import AdminPanel from './components/AdminPanel';\nimport WalletPage from './components/WalletPage';\nimport { Wallet } from 'lucide-react';");
}

if (!code.includes('<Route path="/wallet" element={<WalletPage />} />')) {
  code = code.replace('<Route path="/admin" element={<AdminPanel />} />', '<Route path="/admin" element={<AdminPanel />} />\n                <Route path="/wallet" element={<WalletPage />} />');
}

// Update User Menu in App.tsx to include Wallet button
const userMenuRegex = /<button\s+onClick=\{\(\) => \{ setShowUserMenu\(false\); window\.location\.href = '\/dashboard'; \}\}\s+className="w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"\s*>\s*<User className="w-4 h-4" \/>\s*Dashboard\s*<\/button>/;

const updatedUserMenu = `<button
                        onClick={() => { setShowUserMenu(false); window.location.href = '/dashboard'; }}
                        className="w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <User className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => { setShowUserMenu(false); window.location.href = '/wallet'; }}
                        className="w-full px-4 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Wallet className="w-4 h-4 text-emerald-600" />
                        Wallet
                      </button>`;

code = code.replace(userMenuRegex, updatedUserMenu);

fs.writeFileSync('src/App.tsx', code);
