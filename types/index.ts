export interface ProjectVersion {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
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
}

export interface ProjectMetadata {
  fileType: string;
  fileURL: string;
  versions: ProjectVersion[];
  visibility?: 'personal' | 'public';
}

export interface CreateProjectResponse {
  slug: string;
  shareLink: string;
}

export interface UpdateProjectResponse {
  message: string;
}
