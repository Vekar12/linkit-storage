import { Request, Response, NextFunction } from 'express';
import {
  getAdminStats,
  getAdminUsers,
  getRecentActivity,
} from '../services/adminService';

export async function getStats(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = await getAdminStats();
    res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}

export async function getUsers(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await getAdminUsers();
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

export async function getActivity(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const limit = Math.min(Math.max(parseInt(String(req.query.limit), 10) || 50, 1), 500);
    const activity = await getRecentActivity(limit);
    res.status(200).json(activity);
  } catch (err) {
    next(err);
  }
}
