import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; provider: 'github' | 'google' };
    }
  }
}

// Cache verified tokens for 5 minutes
const tokenCache = new Map<string, { user: { id: string; provider: 'github' | 'google' }; expiresAt: number }>();

// Purge expired entries every 10 minutes to prevent unbounded growth
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokenCache) {
    if (now > val.expiresAt) tokenCache.delete(key);
  }
}, 10 * 60_000);

function verifyToken(
  token: string
): { id: string; provider: 'github' | 'google' } | null {
  const cached = tokenCache.get(token);
  if (cached && Date.now() < cached.expiresAt) return cached.user;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string;
      provider: 'github' | 'google';
    };
    if (!decoded.sub || !decoded.provider) return null;
    const user = { id: decoded.sub, provider: decoded.provider };
    tokenCache.set(token, { user, expiresAt: Date.now() + 5 * 60_000 });
    return user;
  } catch {
    return null;
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const token = authHeader.slice(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  req.user = user;
  next();
}
