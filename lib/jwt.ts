export interface TokenPayload {
  sub: string;
  exp?: number;
  name?: string;
  login?: string;       // GitHub
  email?: string;       // Google
  avatar_url?: string;  // GitHub
  picture?: string;     // Google
  provider?: 'github' | 'google';
}

/** Decodes a JWT payload without verifying the signature (verification is backend's job). */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as TokenPayload;
  } catch {
    return null;
  }
}

/** Returns true if the token is present and not expired. */
export function isTokenValid(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload) return false;
  if (payload.exp && Date.now() / 1000 > payload.exp) return false;
  return true;
}

export function getTokenPayload(): TokenPayload | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('linkit_token');
  if (!token) return null;
  if (!isTokenValid(token)) {
    localStorage.removeItem('linkit_token');
    return null;
  }
  return decodeToken(token);
}
