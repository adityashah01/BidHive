import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { eq, or } from 'drizzle-orm';

export interface AuthRequest extends Request {
  user?: any;
  dbUser?: any;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  if (!token || token === 'null' || token === 'undefined' || token === 'Bearer') {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  try {
    // 1. Check if token corresponds to a local user ID (custom auth or demo session)
    const cleanId = token.startsWith('demo_') ? token.replace('demo_', '') : token;
    
    let localUser = await db.select().from(users).where(
      or(
        eq(users.id, cleanId),
        eq(users.uid, cleanId),
        eq(users.email, cleanId)
      )
    ).then(r => r[0]);

    if (localUser) {
      req.dbUser = localUser;
      req.user = { uid: localUser.uid || localUser.id, email: localUser.email, name: localUser.name };
      return next();
    }

    // 2. Otherwise verify via Firebase Admin SDK
    let decodedToken: any;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (verifyErr: any) {
      if (verifyErr.code === 'auth/id-token-expired' || verifyErr.message?.includes('expired')) {
        return res.status(401).json({ error: 'Unauthorized: Token expired' });
      }
      console.warn('Firebase ID token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Unauthorized: Invalid token signature' });
    }

    req.user = decodedToken;

    // Synchronize user to the database
    const email = decodedToken.email || '';
    const name = decodedToken.name || email.split('@')[0] || 'User';
    const avatar = decodedToken.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
    const uid = decodedToken.uid;

    // Check if user exists
    let existingUser = await db.select().from(users).where(eq(users.uid, uid)).then(r => r[0]);

    if (!existingUser) {
      // Check if a user with this email already exists
      existingUser = await db.select().from(users).where(eq(users.email, email)).then(r => r[0]);

      if (existingUser) {
        // Migrate the existing user's uid to the real Firebase uid
        await db.update(users).set({
          uid,
          name: name || existingUser.name,
          avatar: avatar || existingUser.avatar,
        }).where(eq(users.id, existingUser.id));
        
        existingUser.uid = uid;
        if (name) existingUser.name = name;
        if (avatar) existingUser.avatar = avatar;
      } else {
        // Create user. All new users default to BIDDER.
        const inserted = await db.insert(users).values({
          id: uid,
          uid,
          name,
          email,
          role: 'BIDDER',
          avatar,
          sellerRating: 5.0,
          sellerRatingCount: 0,
          buyerReliabilityScore: 100,
          isBanned: false,
        }).returning();
        existingUser = inserted[0];
      }
    } else {
      // Just update basic profile details if changed
      await db.update(users).set({
        name,
        avatar,
      }).where(eq(users.uid, uid));
    }

    req.dbUser = existingUser;
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};