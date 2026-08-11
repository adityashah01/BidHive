const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// src/App.tsx(6,17): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
// In vite it exists, but TS might need type definition. Let's cast it to any.

content = content.replace("import.meta.env.VITE_PUSHER_KEY", "(import.meta as any).env.VITE_PUSHER_KEY");
content = content.replace("import.meta.env.VITE_PUSHER_CLUSTER", "(import.meta as any).env.VITE_PUSHER_CLUSTER");

fs.writeFileSync('src/App.tsx', content);

