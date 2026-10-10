import { ProjectMetadata } from '../types';
import { UserRecord } from './userService';
import {
  getFileWithSHA,
  listAllOwners,
  listProjectSlugsForOwner,
  readJSON,
} from './githubService';

// ─── Cache ────────────────────────────────────────────────────────────────────

const adminCache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = adminCache.get(key);
  if (!entry || Date.now() > entry.expiresAt) { adminCache.delete(key); return null; }
  return entry.data as T;
}

function setCached(key: string, data: unknown, ttl: number): void {
  adminCache.set(key, { data, expiresAt: Date.now() + ttl });
}

const CSV_PATH = 'users/users.csv';

// Minimal CSV line parser — handles quoted fields (mirrors userService)
function parseRow(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current); current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(raw: string): UserRecord[] {
  const lines = raw.trim().split('\n').slice(1); // skip header
  return lines
    .filter((l) => l.trim())
    .map((line) => {
      const [sub, provider, name, email, avatar, firstLoginAt, lastLoginAt, loginCount] = parseRow(line);
      return {
        sub, provider: provider as 'github' | 'google',
        name, email, avatar, firstLoginAt, lastLoginAt,
        loginCount: parseInt(loginCount, 10) || 1,
      };
    });
}

async function getAllUsers(): Promise<UserRecord[]> {
  try {
    const file = await getFileWithSHA(CSV_PATH);
    if (!file) return [];
    const raw = Buffer.from(file.content, 'base64').toString('utf-8');
    return parseCSV(raw);
  } catch {
    return [];
  }
}

async function getAllProjectMetadata(): Promise<ProjectMetadata[]> {
  const owners = await listAllOwners();
  const perOwner = await Promise.all(
    owners.map(async (ownerId) => {
      const slugs = await listProjectSlugsForOwner(ownerId);
      const metas = await Promise.all(
        slugs.map((s) => readJSON<ProjectMetadata>(`projects/${ownerId}/${s}/metadata.json`))
      );
      return metas.filter(Boolean) as ProjectMetadata[];
    })
  );
  return perOwner.flat();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  projectsByFileType: Record<string, number>;
  recentUploads: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const cached = getCached<AdminStats>('admin:stats');
  if (cached) return cached;

  const [users, projects] = await Promise.all([getAllUsers(), getAllProjectMetadata()]);

  const projectsByFileType: Record<string, number> = {};
  for (const p of projects) {
    const ft = p.fileType || 'unknown';
    projectsByFileType[ft] = (projectsByFileType[ft] || 0) + 1;
  }

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let recentUploads = 0;
  for (const p of projects) {
    for (const v of p.versions) {
      if (new Date(v.uploadedAt).getTime() > sevenDaysAgo) recentUploads++;
    }
  }

  const stats: AdminStats = {
    totalUsers: users.length,
    totalProjects: projects.length,
    projectsByFileType,
    recentUploads,
  };

  setCached('admin:stats', stats, 5 * 60_000);
  return stats;
}

export interface AdminUser extends UserRecord {
  projectCount: number;
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const cached = getCached<AdminUser[]>('admin:users');
  if (cached) return cached;

  const users = await getAllUsers();
  const enriched = await Promise.all(
    users.map(async (u) => {
      const slugs = await listProjectSlugsForOwner(u.sub);
      return { ...u, projectCount: slugs.length };
    })
  );

  setCached('admin:users', enriched, 5 * 60_000);
  return enriched;
}

export interface RecentActivityEntry {
  ownerId: string;
  projectName: string;
  slug: string;
  version: number;
  filename: string;
  uploadedAt: string;
  updatedBy?: string;
  remarks?: string;
}

export async function getRecentActivity(limit: number): Promise<RecentActivityEntry[]> {
  const cached = getCached<RecentActivityEntry[]>(`admin:activity:${limit}`);
  if (cached) return cached;

  const projects = await getAllProjectMetadata();
  const entries: RecentActivityEntry[] = [];

  for (const p of projects) {
    for (const v of p.versions) {
      entries.push({
        ownerId: p.ownerId,
        projectName: p.projectName,
        slug: p.slug,
        version: v.version,
        filename: v.filename,
        uploadedAt: v.uploadedAt,
        updatedBy: v.updatedBy,
        remarks: v.remarks,
      });
    }
  }

  entries.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  const result = entries.slice(0, limit);

  setCached(`admin:activity:${limit}`, result, 2 * 60_000);
  return result;
}
