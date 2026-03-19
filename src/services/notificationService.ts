import { randomBytes } from 'crypto';
import { Notification, VersionEntry } from '../types';
import { readJSON, writeJSON } from './githubService';

const MAX_NOTIFICATIONS = 100;

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: Notification[]; expiresAt: number }>();
const CACHE_TTL = 30_000;

function getCached(userId: string): Notification[] | null {
  const entry = cache.get(userId);
  if (!entry || Date.now() > entry.expiresAt) { cache.delete(userId); return null; }
  return entry.data;
}

function setCached(userId: string, data: Notification[]): void {
  cache.set(userId, { data, expiresAt: Date.now() + CACHE_TTL });
}

function bust(userId: string): void { cache.delete(userId); }

// Purge stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now > val.expiresAt) cache.delete(key);
  }
}, 5 * 60_000);

// ─── Storage helpers ──────────────────────────────────────────────────────────

function notifPath(userId: string): string {
  return `notifications/${userId}.json`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getNotifications(userId: string): Promise<Notification[]> {
  const cached = getCached(userId);
  if (cached) return cached;
  const list = await readJSON<Notification[]>(notifPath(userId)) ?? [];
  const sorted = [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  setCached(userId, sorted);
  return sorted;
}

export async function getUnreadCount(userId: string): Promise<number> {
  const list = await getNotifications(userId);
  return list.filter((n) => !n.read).length;
}

export async function markNotificationRead(
  userId: string,
  notificationId: string
): Promise<boolean> {
  const list = await readJSON<Notification[]>(notifPath(userId));
  if (!list) return false;
  const idx = list.findIndex((n) => n.id === notificationId);
  if (idx < 0) return false;
  list[idx] = { ...list[idx], read: true };
  await writeJSON(notifPath(userId), list, `chore: mark notification read ${notificationId}`);
  bust(userId);
  return true;
}

// Internal — append a notification to a user's list
async function addNotification(userId: string, notification: Notification): Promise<void> {
  try {
    const existing = await readJSON<Notification[]>(notifPath(userId)) ?? [];
    const updated = [notification, ...existing].slice(0, MAX_NOTIFICATIONS);
    await writeJSON(notifPath(userId), updated, `chore: add notification for ${userId}`);
    bust(userId);
  } catch {
    // Never block a project update due to a notification write failure
  }
}

// Fire-and-forget: notify all prior contributors to a project except the current updater
export function notifyContributors(
  versions: VersionEntry[],
  projectOwnerId: string,
  updaterId: string,
  updaterName: string | undefined,
  projectName: string,
  slug: string,
): void {
  // Collect unique contributor IDs from prior versions + always include owner
  const recipients = new Set<string>();
  for (const v of versions) {
    if (v.updatedById) recipients.add(v.updatedById);
  }
  recipients.add(projectOwnerId);
  recipients.delete(updaterId); // don't notify the person who just updated

  if (recipients.size === 0) return;

  const notification: Notification = {
    id: `${Date.now()}-${randomBytes(4).toString('hex')}`,
    projectName,
    slug,
    ownerId: projectOwnerId,
    updatedBy: updaterName ?? 'Someone',
    updatedAt: new Date().toISOString(),
    read: false,
  };

  // Fire all writes in parallel — errors are swallowed inside addNotification
  Promise.allSettled(
    Array.from(recipients).map((userId) => addNotification(userId, notification))
  );
}
