import { Router } from 'express';
import { getStats, getUsers, getActivity } from '../controllers/adminController';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { adminLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(adminLimiter);

router.get('/stats', requireAuth, requireAdmin, getStats);
router.get('/users', requireAuth, requireAdmin, getUsers);
router.get('/activity', requireAuth, requireAdmin, getActivity);

export default router;
