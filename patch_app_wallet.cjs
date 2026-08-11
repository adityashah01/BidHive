const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add wallet state
if (!code.includes('const [walletInfo, setWalletInfo]')) {
  code = code.replace(
    'const [notifications, setNotifications] = useState<Notification[]>([]);',
    'const [notifications, setNotifications] = useState<Notification[]>([]);\n  const [walletInfo, setWalletInfo] = useState<any>(null);'
  );
  
  // 2. Fetch wallet when currentUser changes
  const fetchEffectStr = `  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
      fetchWallet();
    } else {
      setNotifications([]);
      setWalletInfo(null);
    }
  }, [currentUser]);`;
  
  code = code.replace(
    /useEffect\(\(\) => \{\s+if \(currentUser\) \{\s+fetchNotifications\(\);\s+\} else \{\s+setNotifications\(\[\]\);\s+\}\s+\}, \[currentUser\]\);/s,
    fetchEffectStr
  );
  
  // Insert fetchWallet function
  code = code.replace(
    '  const fetchNotifications = async () => {',
    `  const fetchWallet = async () => {
    try {
      const data = await api.get('/api/wallet');
      if (data && data.success) {
        setWalletInfo(data.wallet);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  };

  const fetchNotifications = async () => {`
  );
  
  // 3. Add to Navbar Desktop
  // Before `{/* Notification Bell */}`
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

  // 4. Mobile Menu
  // Wait, need to find Mobile Menu
}
fs.writeFileSync('src/App.tsx', code);
