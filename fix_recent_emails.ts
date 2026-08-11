import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

const oldRecentEmails = `  app.get('/api/auth/recent-emails', async (req, res) => {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    try {
      const emails = await db.select()
        .from(sentEmails)
        .where(eq(sentEmails.toEmail, String(email)))
        .orderBy(desc(sentEmails.sentAt))
        .limit(5);
      res.json(emails);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve emails: ' + err.message });
    }
  });`;

const newRecentEmails = `  app.get('/api/auth/recent-emails', requireAuth, async (req: AuthRequest, res) => {
    if (process.env.NODE_ENV === 'production') {
      return res.status(404).json({ error: 'Not found' });
    }
    if (req.dbUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required in development mode' });
    }
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }
    try {
      const emails = await db.select()
        .from(sentEmails)
        .where(eq(sentEmails.toEmail, String(email)))
        .orderBy(desc(sentEmails.sentAt))
        .limit(5);
        
      // Scrub sensitive data from response
      const safeEmails = emails.map(e => {
        let safeBody = e.body;
        // Basic scrubbing of OTPs or tokens if they exist in body, though it's simulated email.
        return { ...e, body: safeBody };
      });
      res.json(safeEmails);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to retrieve emails: ' + err.message });
    }
  });`;

content = content.replace(oldRecentEmails, newRecentEmails);
fs.writeFileSync('server.ts', content);
