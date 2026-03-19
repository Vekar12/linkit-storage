import { Request, Response, NextFunction } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
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
