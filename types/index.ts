export interface ProjectVersion {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
  remarks?: string;
  updatedBy?: string;
}

export interface Project {
  projectName: string;
  slug: string;
  ownerId: string;
  fileType: string;
  currentFile: string;
  createdAt: string;
  updatedAt: string;
  shareLink?: string;
  versions: ProjectVersion[];
  visibility: 'personal' | 'public';
  editCode?: string;
  ownerName?: string;
  lastUpdatedByName?: string;
  folder?: string;
}

export interface ProjectMetadata {
  fileType: string;
  fileURL: string;
  versions: ProjectVersion[];
  visibility?: 'personal' | 'public';
  editCode?: string;
}

export interface CreateProjectResponse {
  slug: string;
  shareLink: string;
}

export interface UpdateProjectResponse {
  message: string;
}

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  projectsByFileType: Record<string, number>;
  recentUploads: number;
}

export interface AdminUser {
  sub: string;
  provider: string;
  name: string;
  email: string;
  avatar: string;
  firstLoginAt: string;
  lastLoginAt: string;
  loginCount: number;
  projectCount: number;
}

export interface AdminActivity {
  projectName: string;
  slug: string;
  ownerId: string;
  ownerName: string;
  version: number;
  uploadedAt: string;
  updatedBy: string;
}

export interface Notification {
  id: string;
  projectName: string;
  slug: string;
  ownerId: string;
  updatedBy: string;
  updatedAt: string;
  read: boolean;
}
