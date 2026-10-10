import { Router } from 'express';
import { githubCallback, googleRedirect, googleCallback } from '../controllers/authController';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

// GitHub OAuth
router.get('/callback', authLimiter, githubCallback);

// Google OAuth
router.get('/google', authLimiter, googleRedirect);
router.get('/google/callback', authLimiter, googleCallback);

export default router;
