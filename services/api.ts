import axios from 'axios';
import type {
  Project,
  ProjectMetadata,
  CreateProjectResponse,
  UpdateProjectResponse,
} from '@/types';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
});

// Attach Bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('linkit_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On 401, clear token and redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('linkit_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const createProject = async (
  projectName: string,
  file: File,
  visibility: 'personal' | 'public' = 'personal'
): Promise<CreateProjectResponse> => {
  const formData = new FormData();
  formData.append('projectName', projectName);
  formData.append('file', file);
  formData.append('visibility', visibility);
  const { data } = await api.post<CreateProjectResponse>('/projects', formData);
  return data;
};

export const updateProject = async (
  slug: string,
  file: File,
  ownerId?: string
): Promise<UpdateProjectResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const url = ownerId ? `/projects/${ownerId}/${slug}` : `/projects/${slug}`;
  const { data } = await api.put<UpdateProjectResponse>(url, formData);
  return data;
};

export const getProjects = async (): Promise<Project[]> => {
  const { data } = await api.get<Project[]>('/projects');
  return data;
};

export const getProjectMetadata = async (
  ownerId: string,
  slug: string
): Promise<ProjectMetadata> => {
  const { data } = await api.get<ProjectMetadata>(`/projects/${ownerId}/${slug}/metadata`);
  return data;
};

export const deleteProject = async (slug: string): Promise<void> => {
  await api.delete(`/projects/${slug}`);
};

export const setProjectVisibility = async (
  slug: string,
  visibility: 'personal' | 'public'
): Promise<void> => {
  await api.patch(`/projects/${slug}`, { visibility });
};

export const getPublicProjects = async (): Promise<Project[]> => {
  const { data } = await api.get<Project[]>('/projects/public');
  return data;
};
