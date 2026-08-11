import fs from 'fs';
let app = fs.readFileSync('src/App.tsx', 'utf-8');

app = app.replace("import Login from './components/Login';", "const Login = lazy(() => import('./components/Login'));");
app = app.replace(
  /<Login\s+onLoginSuccess=\{\(user\) => \{\s+handleLoginSuccess\(user\);\s+\}\}\s+\/>/g,
  "<Suspense fallback={<div className=\"min-h-[50vh] flex items-center justify-center\"><Loader2 className=\"w-8 h-8 text-red-600 animate-spin\" /></div>}><Login onLoginSuccess={(user) => { handleLoginSuccess(user); }} /></Suspense>"
);

fs.writeFileSync('src/App.tsx', app);
