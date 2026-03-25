import { Request, Response, NextFunction } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markNotificationsRead,
} from '../services/notificationService';

// GET /notifications
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const notifications = await getNotifications(req.user!.id);
    res.status(200).json(notifications);
  } catch (err) {
    next(err);
  }
}

// GET /notifications/unread-count
export async function unreadCount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const count = await getUnreadCount(req.user!.id);
    res.status(200).json({ count });
  } catch (err) {
    next(err);
  }
}

// PATCH /notifications/read — batch mark multiple notifications as read
export async function markManyRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const raw = req.body.ids;
    if (!Array.isArray(raw) || raw.length === 0) {
      res.status(400).json({ error: 'ids must be a non-empty array' });
      return;
    }
    const NOTIF_ID_RE = /^\d+-[a-f0-9]+$/;
    const ids = raw.filter((id): id is string => typeof id === 'string' && NOTIF_ID_RE.test(id));
    if (ids.length === 0) {
      res.status(400).json({ error: 'No valid notification IDs provided' });
      return;
    }
    const count = await markNotificationsRead(req.user!.id, ids);
    res.status(200).json({ marked: count });
  } catch (err) {
    next(err);
  }
}

// PATCH /notifications/:id/read
export async function markRead(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const found = await markNotificationRead(req.user!.id, req.params.id);
    if (!found) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }
    res.status(200).json({ message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}
