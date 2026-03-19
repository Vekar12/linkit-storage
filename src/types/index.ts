export interface VersionEntry {
  version: number;
  filename: string;
  fileURL: string;
  uploadedAt: string;
  updatedBy?: string;    // display name of whoever uploaded this version
  updatedById?: string;  // user ID — used for notification routing
  remarks?: string;      // optional note from uploader
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

export interface Notification {
  id: string;
  projectName: string;
  slug: string;
  ownerId: string;
  updatedBy: string;  // display name of whoever triggered the notification
  updatedAt: string;
  read: boolean;
}
