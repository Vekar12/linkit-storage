import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Project, ProjectFile, PaginationParams, PaginatedResult } from '../types';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }
  return _client;
}

// ─── Projects ────────────────────────────────────────────────────────────────

export async function createProject(name: string, slug: string): Promise<Project> {
  const { data, error } = await getClient()
    .from('projects')
    .insert({ name, slug })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getProjects(
  { page, limit }: PaginationParams
): Promise<PaginatedResult<Project>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await getClient()
    .from('projects')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > page * limit,
  };
}

export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await getClient()
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function updateProjectTimestamp(id: string): Promise<void> {
  await getClient()
    .from('projects')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await getClient().from('projects').delete().eq('id', id);
  if (error) throw error;
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function createFileRecord(
  input: Omit<ProjectFile, 'id' | 'created_at' | 'updated_at'>
): Promise<ProjectFile> {
  const { data, error } = await getClient()
    .from('files')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getFilesByProject(
  projectId: string,
  { page, limit }: PaginationParams
): Promise<PaginatedResult<ProjectFile>> {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await getClient()
    .from('files')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
  return {
    data: data || [],
    total: count || 0,
    page,
    limit,
    hasMore: (count || 0) > page * limit,
  };
}

export async function getFileById(id: string): Promise<ProjectFile | null> {
  const { data, error } = await getClient()
    .from('files')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return null;
  return data;
}

export async function getFilePathsByProject(projectId: string): Promise<string[]> {
  const { data, error } = await getClient()
    .from('files')
    .select('github_path')
    .eq('project_id', projectId);
  if (error) return [];
  return (data || []).map((f: { github_path: string }) => f.github_path);
}

export async function deleteFileRecord(id: string): Promise<void> {
  const { error } = await getClient().from('files').delete().eq('id', id);
  if (error) throw error;
}
