import { ProjectMetadata, Visibility } from '../types';
import { readJSON, writeJSON, listProjectSlugs, deleteFile } from './githubService';

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
  visibility: Visibility = 'personal'
): Promise<ProjectMetadata> {
  const now = new Date().toISOString();
  const metadata: ProjectMetadata = {
    projectName,
    slug,
    fileType,
    currentFile: filename,
    ownerId,
    visibility,
    createdAt: now,
    updatedAt: now,
    versions: [{ version: 1, filename, fileURL, uploadedAt: now }],
  };
  await writeJSON(`projects/${slug}/metadata.json`, metadata, `feat: create project ${slug}`);
  bust('projects');
  return metadata;
}

export async function getAllProjects(): Promise<ProjectMetadata[]> {
  let projects = getCached<ProjectMetadata[]>('projects');
  if (!projects) {
    const slugs = await listProjectSlugs();
    const results = await Promise.all(
      slugs.map((s) => readJSON<ProjectMetadata>(`projects/${s}/metadata.json`))
    );
    projects = (results.filter(Boolean) as ProjectMetadata[]).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setCached('projects', projects);
  }
  return projects;
}

export async function getProjectBySlug(slug: string): Promise<ProjectMetadata | null> {
  const cached = getCached<ProjectMetadata>(`project:${slug}`);
  if (cached) return cached;
  const meta = await readJSON<ProjectMetadata>(`projects/${slug}/metadata.json`);
  if (meta) setCached(`project:${slug}`, meta);
  return meta;
}

export async function updateProjectMetadata(
  slug: string,
  updates: Partial<ProjectMetadata>
): Promise<ProjectMetadata | null> {
  const meta = await getProjectBySlug(slug);
  if (!meta) return null;
  const updated = { ...meta, ...updates, updatedAt: new Date().toISOString() };
  await writeJSON(`projects/${slug}/metadata.json`, updated, `chore: update ${slug}`);
  bust(`project:${slug}`, 'projects');
  return updated;
}

export async function deleteProjectMetadata(slug: string): Promise<void> {
  await deleteFile(`projects/${slug}/metadata.json`, `chore: delete project ${slug}`);
  bust(`project:${slug}`, 'projects');
}
