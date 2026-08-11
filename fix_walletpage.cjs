const fs = require('fs');

let content = fs.readFileSync('src/components/WalletPage.tsx', 'utf8');
content = content.replace("import { useAuth } from '../hooks/useAuth';", "");
content = content.replace("const { currentUser } = useAuth();", "const { currentUser } = props;");
content = content.replace("export default function WalletPage() {", "export default function WalletPage(props: { currentUser: any }) {");
fs.writeFileSync('src/components/WalletPage.tsx', content);

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Add WALLET to view type
const viewRegex = /const \[view, setView\] = useState<'BROWSE' \| 'DETAIL' \| 'CREATE' \| 'DASHBOARD' \| 'ADMIN' \| 'PAYMENT' \| 'SUPER_ADMIN_LOGIN' \| 'SUPER_ADMIN_PANEL' \| 'LOGIN'>\('BROWSE'\);/;
appContent = appContent.replace(viewRegex, "const [view, setView] = useState<'BROWSE' | 'DETAIL' | 'CREATE' | 'DASHBOARD' | 'ADMIN' | 'PAYMENT' | 'SUPER_ADMIN_LOGIN' | 'SUPER_ADMIN_PANEL' | 'LOGIN' | 'WALLET'>('BROWSE');");

// Update Wallet button in navbar to setView('WALLET')
appContent = appContent.replace("window.location.href = '/wallet';", "setView('WALLET');");
appContent = appContent.replace("window.location.href = '/dashboard';", "setView('DASHBOARD');");

// Render WalletPage when view === 'WALLET'
const mainRenderRegex = /\{\/\* FOOTER \*\/\}/;
appContent = appContent.replace(mainRenderRegex, `
        {view === 'WALLET' && (
          <div className="pt-4">
            <WalletPage currentUser={currentUser} />
          </div>
        )}
        
        {/* FOOTER */}`);

fs.writeFileSync('src/App.tsx', appContent);

