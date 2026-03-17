export interface TokenPayload {
  sub: string;
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

export function getTokenPayload(): TokenPayload | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('linkit_token');
  if (!token) return null;
  return decodeToken(token);
}
