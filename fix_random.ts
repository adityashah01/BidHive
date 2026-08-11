import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

// Replace generateId
content = content.replace(
  "const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 11)}`;",
  "import crypto from 'crypto';\n  const generateId = (prefix: string) => `${prefix}-${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;"
);

// Replace user uid generation (though ideally we should use Firebase UID, but this is the fallback for traditional login, wait, the prompt says "Registration and login currently return a raw UID as the token. Required architecture: Frontend: Sign in through Firebase Authentication. Obtain a real Firebase ID token.")
// Since we are changing auth to Firebase ONLY, maybe we just delete the traditional /api/auth/register and /api/auth/login?
// Wait, the prompt says "Remove raw UID and demo-token authentication." and "Registration and login currently return a raw UID as the token. Required architecture: Frontend: Sign in through Firebase Authentication."
// I should check if the frontend uses /api/auth/register or firebase auth.

content = content.replace(
  "const uid = `usr-${Math.random().toString(36).substring(2, 11)}`;",
  "const uid = `usr-${crypto.randomUUID()}`;"
);

content = content.replace(
  "const code = Math.floor(100000 + Math.random() * 900000).toString();",
  "const code = crypto.randomInt(100000, 999999).toString();"
);

content = content.replace(
  "const resetToken = `rst-${Math.random().toString(36).substring(2, 11)}${Math.random().toString(36).substring(2, 11)}`;",
  "const resetToken = crypto.randomBytes(32).toString('hex');"
);

fs.writeFileSync('server.ts', content);
