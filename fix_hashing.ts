import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');

// For 2FA
const old2FA = `      // Generate and store OTP code
      const code = crypto.randomInt(100000, 999999).toString();
      await db.update(users)
        .set({ twoFactorCode: code })
        .where(eq(users.id, user.id));`;
const new2FA = `      // Generate and store OTP code
      const code = crypto.randomInt(100000, 999999).toString();
      const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
      await db.update(users)
        .set({ twoFactorCode: hashedCode })
        .where(eq(users.id, user.id));`;

const oldVerify2FA = `      if (user.twoFactorCode !== code) {
        return res.status(401).json({ error: 'Invalid 2FA code.' });
      }

      // Clear the code after successful use
      await db.update(users)
        .set({ twoFactorCode: null })
        .where(eq(users.id, user.id));`;
const newVerify2FA = `      const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
      if (user.twoFactorCode !== hashedInput) {
        return res.status(401).json({ error: 'Invalid 2FA code.' });
      }

      // Clear the code after successful use
      await db.update(users)
        .set({ twoFactorCode: null })
        .where(eq(users.id, user.id));`;

// For Forgot Password
const oldForgot = `      // Create reset token valid for 15 minutes
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.update(users)
        .set({ resetToken, resetTokenExpiry })
        .where(eq(users.id, user.id));`;
const newForgot = `      // Create reset token valid for 15 minutes
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

      await db.update(users)
        .set({ resetToken: hashedToken, resetTokenExpiry })
        .where(eq(users.id, user.id));`;

const oldReset = `      const user = await db.select().from(users).where(eq(users.resetToken, token)).then(r => r[0]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }`;
const newReset = `      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await db.select().from(users).where(eq(users.resetToken, hashedToken)).then(r => r[0]);
      if (!user) {
        return res.status(400).json({ error: 'Invalid or expired password reset token.' });
      }`;

content = content.replace(old2FA, new2FA);
content = content.replace(oldVerify2FA, newVerify2FA);
content = content.replace(oldForgot, newForgot);
content = content.replace(oldReset, newReset);

fs.writeFileSync('server.ts', content);
