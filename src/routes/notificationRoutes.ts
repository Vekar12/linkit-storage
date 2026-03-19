import { Router, Request, Response, NextFunction } from 'express';
import { listNotifications, unreadCount, markRead } from '../controllers/notificationController';
import { requireAuth } from '../middleware/auth';
import { notificationsLimiter } from '../middleware/rateLimiter';

const NOTIF_ID_RE = /^\d+-[a-f0-9]+$/;

function validateNotifId(req: Request, res: Response, next: NextFunction): void {
  if (!NOTIF_ID_RE.test(req.params.id)) {
    res.status(400).json({ error: 'Invalid notification ID' });
    return;
  }
  next();
}

const router = Router();

// Must be declared before /:id routes
router.get('/unread-count', requireAuth, notificationsLimiter, unreadCount);
router.get('/', requireAuth, notificationsLimiter, listNotifications);
router.patch('/:id/read', requireAuth, validateNotifId, markRead);

export default router;
