const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace("pusherClient = new Pusher(import.meta.env.VITE_PUSHER_KEY", "pusherClient = new Pusher((import.meta as any).env.VITE_PUSHER_KEY");
content = content.replace("cluster: import.meta.env.VITE_PUSHER_CLUSTER", "cluster: (import.meta as any).env.VITE_PUSHER_CLUSTER");
fs.writeFileSync('src/App.tsx', content);
