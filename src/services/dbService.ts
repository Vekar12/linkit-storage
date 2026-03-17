import { Project, ProjectFile, PaginationParams, PaginatedResult } from '../types';
import {
  readJSON,
  writeJSON,
  deleteFile,
  listProjectIds,
} from './githubService';

// ─── In-memory cache ──────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

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

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function createProject(name: string, slug: string): Promise<Project> {
  const project: Project = {
    id: crypto.randomUUID(),
    name,
    slug,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Write metadata + empty files list in parallel
  await Promise.all([
    writeJSON(`projects/${project.id}/metadata.json`, project, `feat: create project ${slug}`),
    writeJSON(`projects/${project.id}/files.json`, [], `feat: init files for ${slug}`),
  ]);

  bust('projects');
  return project;
}

export async function getProjects(
  { page, limit }: PaginationParams
): Promise<PaginatedResult<Project>> {
  let projects = getCached<Project[]>('projects');

  if (!projects) {
    const ids = await listProjectIds();
    const results = await Promise.all(
      ids.map((id) => readJSON<Project>(`projects/${id}/metadata.json`))
    );
    projects = (results.filter(Boolean) as Project[]).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setCached('projects', projects);
  }

  const total = projects.length;
  const start = (page - 1) * limit;
  return {
    data: projects.slice(start, start + limit),
    total,
    page,
    limit,
    hasMore: total > page * limit,
  };
}

export async function getProjectById(id: string): Promise<Project | null> {
  const cached = getCached<Project>(`project:${id}`);
  if (cached) return cached;
  const project = await readJSON<Project>(`projects/${id}/metadata.json`);
  if (project) setCached(`project:${id}`, project);
  return project;
}

export async function updateProjectTimestamp(id: string): Promise<void> {
  const project = await getProjectById(id);
  if (!project) return;
  project.updated_at = new Date().toISOString();
  await writeJSON(`projects/${id}/metadata.json`, project, `chore: update ${id}`);
  bust(`project:${id}`, 'projects');
}

export async function deleteProject(id: string): Promise<void> {
  // Delete metadata and files index from GitHub
  await Promise.allSettled([
    deleteFile(`projects/${id}/metadata.json`, `chore: delete project ${id}`),
    deleteFile(`projects/${id}/files.json`, `chore: delete project ${id}`),
  ]);
  bust(`project:${id}`, 'projects');
}

// ─── Files ────────────────────────────────────────────────────────────────────

async function readFilesJSON(projectId: string): Promise<ProjectFile[]> {
  return (await readJSON<ProjectFile[]>(`projects/${projectId}/files.json`)) || [];
}

export async function createFileRecord(
  input: Omit<ProjectFile, 'id' | 'created_at' | 'updated_at'>
): Promise<ProjectFile> {
  const file: ProjectFile = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const files = await readFilesJSON(input.project_id);
  files.unshift(file); // newest first
  await writeJSON(
    `projects/${input.project_id}/files.json`,
    files,
    `feat: add file ${file.name}`
  );

  setCached(`file:${file.id}`, file);
  bust(`files:${input.project_id}`, 'projects');
  return file;
}

export async function getFilesByProject(
  projectId: string,
  { page, limit }: PaginationParams
): Promise<PaginatedResult<ProjectFile>> {
  let files = getCached<ProjectFile[]>(`files:${projectId}`);

  if (!files) {
    files = await readFilesJSON(projectId);
    setCached(`files:${projectId}`, files);
  }

  const total = files.length;
  const start = (page - 1) * limit;
  return {
    data: files.slice(start, start + limit),
    total,
    page,
    limit,
    hasMore: total > page * limit,
  };
}

export async function getFileById(id: string): Promise<ProjectFile | null> {
  // Check cache first — usually a hit since we cache on upload + list
  const cached = getCached<ProjectFile>(`file:${id}`);
  if (cached) return cached;

  // Cache miss — scan all projects (fallback, rare after server restart)
  const ids = await listProjectIds();
  for (const projectId of ids) {
    const files = await readFilesJSON(projectId);
    const file = files.find((f) => f.id === id);
    if (file) {
      setCached(`file:${id}`, file);
      return file;
    }
  }
  return null;
}

export async function getFilePathsByProject(projectId: string): Promise<string[]> {
  const files = await readFilesJSON(projectId);
  return files.map((f) => f.github_path);
}

export async function deleteFileRecord(id: string): Promise<void> {
  const file = await getFileById(id);
  if (!file) return;

  const files = await readFilesJSON(file.project_id);
  const updated = files.filter((f) => f.id !== id);
  await writeJSON(
    `projects/${file.project_id}/files.json`,
    updated,
    `chore: delete file ${file.name}`
  );

  bust(`file:${id}`, `files:${file.project_id}`);
}
