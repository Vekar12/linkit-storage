import { Router } from 'express';
import { githubCallback, googleRedirect, googleCallback } from '../controllers/authController';

const router = Router();

// GitHub OAuth
router.get('/callback', githubCallback);

// Google OAuth
router.get('/google', googleRedirect);
router.get('/google/callback', googleCallback);

export default router;
