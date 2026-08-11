import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

const loader = `<div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 text-red-600 animate-spin" /></div>`;

// 1. ListingDetail
app = app.replace(
  /<ListingDetail([\s\S]*?)onClose=\{\(\) => handleUrlRouting\(\)\} \/>/g,
  `<Suspense fallback={${loader}}><ListingDetail$1onClose={() => handleUrlRouting()} /></Suspense>`
);

// 2. CreateListingForm
app = app.replace(
  /<CreateListingForm([\s\S]*?)onCancel=\{\(\) => setView\('BROWSE'\)\} \/>/g,
  `<Suspense fallback={${loader}}><CreateListingForm$1onCancel={() => setView('BROWSE')} /></Suspense>`
);

// 3. AdminPanel
app = app.replace(
  /<AdminPanel \/>/g,
  `<Suspense fallback={${loader}}><AdminPanel /></Suspense>`
);

// 4. WalletPage
app = app.replace(
  /<WalletPage([\s\S]*?)onBack=\{\(\) => setView\('BROWSE'\)\} \/>/g,
  `<Suspense fallback={${loader}}><WalletPage$1onBack={() => setView('BROWSE')} /></Suspense>`
);

// 5. PaymentPage
app = app.replace(
  /<PaymentPage([\s\S]*?)\/>/g,
  `<Suspense fallback={${loader}}><PaymentPage$1/></Suspense>`
);

fs.writeFileSync('src/App.tsx', app);

