import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';

const FRONTEND_URL = () => process.env.FRONTEND_URL || 'http://localhost:3001';
const BACKEND_URL = () => process.env.BACKEND_URL || 'https://linkit-backend-tuj9.onrender.com';

// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

// GET /auth/callback?code=...
export async function githubCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.query;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing OAuth code' });
      return;
    }

    // Exchange code for GitHub access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: 'application/json' } }
    );

    const data = tokenResponse.data as Record<string, string>;
    const { access_token, error, error_description } = data;

    if (error) {
      res.redirect(`${FRONTEND_URL()}/auth/callback?error=${encodeURIComponent(error_description || error)}`);
      return;
    }

    // Fetch GitHub user info and wrap in a signed app JWT
    // This avoids exposing raw GitHub tokens to the frontend
    const { data: ghUser } = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const appToken = jwt.sign(
      {
        sub: String(ghUser.id),
        login: ghUser.login,
        name: ghUser.name,
        avatar_url: ghUser.avatar_url,
        provider: 'github',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.redirect(`${FRONTEND_URL()}/auth/callback?token=${appToken}`);
  } catch (err) {
    next(err);
  }
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

// GET /auth/google
export function googleRedirect(_req: Request, res: Response): void {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${BACKEND_URL()}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

// GET /auth/google/callback?code=...
export async function googleCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code, error } = req.query;

    if (error) {
      res.redirect(`${FRONTEND_URL()}/auth/callback?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Missing OAuth code' });
      return;
    }

    // Exchange code for tokens
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${BACKEND_URL()}/auth/google/callback`,
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const { access_token } = tokenResponse.data as Record<string, string>;

    // Get user info from Google
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const { sub, email, name, picture } = userResponse.data as Record<string, string>;

    const appToken = jwt.sign(
      { sub, email, name, picture, provider: 'google' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.redirect(`${FRONTEND_URL()}/auth/callback?token=${appToken}`);
  } catch (err) {
    next(err);
  }
}
