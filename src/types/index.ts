export interface VersionEntry {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
}

export interface ProjectMetadata {
  projectName: string;
  slug: string;
  fileType: string;
  currentFile: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  versions: VersionEntry[];
}
