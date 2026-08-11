import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const oldRole = `  app.post('/api/auth/role', requireAuth, async (req: AuthRequest, res) => {
    const { role } = req.body;
    if (!['BIDDER', 'SELLER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role for self-selection' });
    }
    try {
      const updated = await db.update(users)
        .set({ role })
        .where(eq(users.uid, req.user.uid))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update role: ' + error.message });
    }
  });`;

const newRole = `  app.post('/api/auth/role', requireAuth, async (req: AuthRequest, res) => {
    const { role } = req.body;
    if (role === 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Cannot self-assign ADMIN role' });
    }
    if (!['BIDDER', 'SELLER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role for self-selection' });
    }
    try {
      const updated = await db.update(users)
        .set({ role })
        .where(eq(users.uid, req.user.uid))
        .returning();
      res.json(updated[0]);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to update role: ' + error.message });
    }
  });`;

content = content.replace(oldRole, newRole);
fs.writeFileSync('server.ts', content);
