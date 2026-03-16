import { Router } from 'express';
import { githubCallback } from '../controllers/authController';

const router = Router();

router.get('/callback', githubCallback);

export default router;
