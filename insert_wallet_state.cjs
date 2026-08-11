const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('const [walletInfo, setWalletInfo]')) {
  // Add state
  code = code.replace(
    'const [notifications, setNotifications] = useState<Notification[]>([]);',
    'const [notifications, setNotifications] = useState<Notification[]>([]);\n  const [walletInfo, setWalletInfo] = useState<any>(null);'
  );
  
  // Add useEffect
  const effectStr = `
  useEffect(() => {
    if (currentUser && view !== 'WALLET') {
      api.get('/api/wallet')
        .then(res => {
          if (res && res.success) {
            setWalletInfo(res.wallet);
          }
        })
        .catch(console.error);
    } else if (!currentUser) {
      setWalletInfo(null);
    }
  }, [currentUser, view]); // Re-fetch when navigating to/from views or user changes
`;

  code = code.replace(
    '  // Fetch listings on mount and when filter changes',
    effectStr + '\n  // Fetch listings on mount and when filter changes'
  );
  
  // Add to Navbar Desktop
  const desktopNavBtn = `{/* Wallet Balance */}
                <button
                  onClick={() => navigate('/wallet')}
                  className={\`px-3 py-2 mr-1 rounded-xl text-xs font-bold transition-all duration-300 cursor-pointer flex items-center gap-1.5 \${
                    view === 'WALLET'
                      ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }\`}
                >
                  <Wallet className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Wallet: Rs. {walletInfo?.availableBalance?.toLocaleString() || '0'}</span>
                </button>
                
                {/* Notification Bell */}`;
  
  code = code.replace('{/* Notification Bell */}', desktopNavBtn);
  
  // Mobile Nav
  const mobileNavBtn = `{/* Mobile Wallet */}
                  <button
                    onClick={() => { navigate('/wallet'); setMobileMenuOpen(false); }}
                    className={\`w-full text-left px-4 py-3 text-sm font-bold flex items-center gap-2 \${
                      view === 'WALLET' ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-50'
                    }\`}
                  >
                    <Wallet className="w-4 h-4 text-indigo-500" />
                    Wallet (Rs. {walletInfo?.availableBalance?.toLocaleString() || '0'})
                  </button>
                  
                  <button
                    onClick={() => {`;
  code = code.replace(
    '                  <button\n                    onClick={() => {\n                      setMobileMenuOpen(false);\n                      handleLogout();',
    mobileNavBtn + '\n                      setMobileMenuOpen(false);\n                      handleLogout();'
  );

  fs.writeFileSync('src/App.tsx', code);
}
