export interface ProjectVersion {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
}

export interface Project {
  projectName: string;
  slug: string;
  fileType: string;
  currentFile: string;
  createdAt: string;
  updatedAt: string;
  versions: ProjectVersion[];
}

export interface ProjectMetadata {
  fileType: string;
  fileURL: string;
  versions: ProjectVersion[];
}

export interface CreateProjectResponse {
  slug: string;
  shareLink: string;
}

export interface UpdateProjectResponse {
  message: string;
}
