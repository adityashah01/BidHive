import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const buyStart = "app.post('/api/listings/:id/buynow', requireAuth, async (req: AuthRequest, res) => {";
// Replace until the end of the route
// Let's find the end of the route
