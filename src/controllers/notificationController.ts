import { Request, Response, NextFunction } from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markNotificationsRead,
  clearNotifications,
} from '../services/notificationService';

// GET /notifications?limit=N&offset=N
export async function listNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let limit: number | undefined;
    let offset = 0;

    if (req.query.limit !== undefined) {
      limit = parseInt(String(req.query.limit), 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        res.status(400).json({ error: 'limit must be an integer between 1 and 100' });
        return;
      }
    }
    if (req.query.offset !== undefined) {
      offset = parseInt(String(req.query.offset), 10);
      if (isNaN(offset) || offset < 0) {
        res.status(400).json({ error: 'offset must be a non-negative integer' });
        return;
      }
    }

    const notifications = await getNotifications(req.user!.id, limit, offset);
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

// DELETE /notifications — clear all notifications for the authenticated user
export async function deleteAllNotifications(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await clearNotifications(req.user!.id);
    res.status(200).json({ message: 'Notifications cleared' });
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
