import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; provider: 'github' | 'google' };
    }
  }
}

// Cache verified tokens for 5 minutes to avoid repeated API calls
const tokenCache = new Map<string, { user: { id: string; provider: 'github' | 'google' }; expiresAt: number }>();

async function verifyToken(
  token: string
): Promise<{ id: string; provider: 'github' | 'google' } | null> {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  // Try Google JWT first (fast, no network call)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const user = { id: decoded.sub, provider: 'google' as const };
    tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60_000 });
    return user;
  } catch {}

  // Try GitHub access token
  try {
    const { data } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = { id: String(data.id), provider: 'github' as const };
    tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60_000 });
    return user;
  } catch {}

  return null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  const user = await verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
}
