export interface VersionEntry {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
}

export type Visibility = 'personal' | 'public';

export interface ProjectMetadata {
  projectName: string;
  slug: string;
  fileType: string;
  currentFile: string;
  ownerId: string;
  ownerName?: string;
  lastUpdatedByName?: string;
  visibility: Visibility;
  editCode?: string;
  createdAt: string;
  updatedAt: string;
  versions: VersionEntry[];
}
