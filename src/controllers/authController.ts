import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

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

    // Exchange code for access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token, error, error_description } = tokenResponse.data;

    if (error) {
      res.redirect(`http://localhost:3001/auth/callback?error=${encodeURIComponent(error_description || error)}`);
      return;
    }

    res.redirect(`http://localhost:3001/auth/callback?token=${access_token}`);
  } catch (err) {
    next(err);
  }
}
