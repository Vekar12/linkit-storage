import { ProjectMetadata, Visibility } from '../types';
import {
  readJSON,
  writeJSON,
  listAllOwners,
  listProjectSlugsForOwner,
  deleteFile,
} from './githubService';

// ─── Cache ────────────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60_000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data as T;
}

function setCached(key: string, data: unknown): void {
  cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL });
}

function bust(...keys: string[]): void {
  keys.forEach((k) => cache.delete(k));
}

// Purge stale cache entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (now > val.expiresAt) cache.delete(key);
  }
}, 5 * 60_000);

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProjectMetadata(
  projectName: string,
  slug: string,
  filename: string,
  fileType: string,
  fileURL: string,
  ownerId: string,
  visibility: Visibility = 'personal',
  ownerName?: string,
  editCode?: string
): Promise<ProjectMetadata> {
  const now = new Date().toISOString();
  const metadata: ProjectMetadata = {
    projectName,
    slug,
    fileType,
    currentFile: filename,
    ownerId,
    ownerName,
    lastUpdatedByName: ownerName,
    visibility,
    ...(editCode ? { editCode } : {}),
    createdAt: now,
    updatedAt: now,
    versions: [{ version: 1, filename, fileURL, uploadedAt: now, updatedBy: ownerName, updatedById: ownerId }],
  };
  await writeJSON(
    `projects/${ownerId}/${slug}/metadata.json`,
    metadata,
    `feat: create project ${slug}`
  );
  bust(`projects:${ownerId}`);
  return metadata;
}

// Returns all projects belonging to a specific owner
export async function getProjectsByOwner(ownerId: string): Promise<ProjectMetadata[]> {
  const cacheKey = `projects:${ownerId}`;
  let projects = getCached<ProjectMetadata[]>(cacheKey);
  if (!projects) {
    const slugs = await listProjectSlugsForOwner(ownerId);
    const results = await Promise.all(
      slugs.map((s) => readJSON<ProjectMetadata>(`projects/${ownerId}/${s}/metadata.json`))
    );
    projects = (results.filter(Boolean) as ProjectMetadata[])
      .map((p) => ({ ...p, visibility: p.visibility ?? 'personal' }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCached(cacheKey, projects);
  }
  return projects;
}

export async function getProjectBySlug(
  ownerId: string,
  slug: string
): Promise<ProjectMetadata | null> {
  const cacheKey = `project:${ownerId}:${slug}`;
  const cached = getCached<ProjectMetadata>(cacheKey);
  if (cached) return cached;
  const meta = await readJSON<ProjectMetadata>(`projects/${ownerId}/${slug}/metadata.json`);
  if (meta) {
    const normalised = { ...meta, visibility: meta.visibility ?? 'personal' } as ProjectMetadata;
    setCached(cacheKey, normalised);
    return normalised;
  }
  return null;
}

export async function updateProjectMetadata(
  ownerId: string,
  slug: string,
  updates: Partial<ProjectMetadata>
): Promise<ProjectMetadata | null> {
  const meta = await getProjectBySlug(ownerId, slug);
  if (!meta) return null;
  const updated = { ...meta, ...updates, updatedAt: new Date().toISOString() };
  await writeJSON(
    `projects/${ownerId}/${slug}/metadata.json`,
    updated,
    `chore: update ${slug}`
  );
  bust(`project:${ownerId}:${slug}`, `projects:${ownerId}`, 'projects:public');
  return updated;
}

// Returns all public projects across all users — cached for 60s
export async function getAllPublicProjects(): Promise<ProjectMetadata[]> {
  const cacheKey = 'projects:public';
  let projects = getCached<ProjectMetadata[]>(cacheKey);
  if (!projects) {
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
    projects = perOwner
      .flat()
      .filter((p) => p.visibility === 'public')
      .map((p) => ({ ...p, visibility: 'public' as const }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setCached(cacheKey, projects);
  }
  return projects;
}

export async function deleteProjectMetadata(ownerId: string, slug: string): Promise<void> {
  await deleteFile(
    `projects/${ownerId}/${slug}/metadata.json`,
    `chore: delete project ${slug}`
  );
  bust(`project:${ownerId}:${slug}`, `projects:${ownerId}`, 'projects:public');
}
