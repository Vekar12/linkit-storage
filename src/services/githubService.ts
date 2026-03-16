import { Octokit } from '@octokit/rest';

function getClient() {
  return new Octokit({ auth: process.env.GITHUB_TOKEN });
}

function getRepo() {
  return {
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
  };
}

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
  createdAt: string;
  updatedAt: string;
  versions: VersionEntry[];
}

async function getFileSHA(filePath: string): Promise<string | undefined> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: filePath });
    if (!Array.isArray(data) && 'sha' in data) return data.sha;
  } catch {
    return undefined;
  }
}

// Returns raw base64 content (safe for binary files)
export async function getFileContentBase64(filePath: string): Promise<string | null> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: filePath });
    if (!Array.isArray(data) && 'content' in data) {
      return data.content.replace(/\n/g, '');
    }
    return null;
  } catch {
    return null;
  }
}

// Returns decoded UTF-8 string (for JSON files)
export async function getFileContentText(filePath: string): Promise<string | null> {
  const base64 = await getFileContentBase64(filePath);
  if (!base64) return null;
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export async function createFile(
  filePath: string,
  content: Buffer,
  message: string
): Promise<void> {
  await getClient().repos.createOrUpdateFileContents({
    ...getRepo(),
    path: filePath,
    message,
    content: content.toString('base64'),
  });
}

export async function createFileFromBase64(
  filePath: string,
  base64Content: string,
  message: string
): Promise<void> {
  await getClient().repos.createOrUpdateFileContents({
    ...getRepo(),
    path: filePath,
    message,
    content: base64Content,
  });
}

export async function updateFile(
  filePath: string,
  content: Buffer,
  message: string
): Promise<void> {
  const sha = await getFileSHA(filePath);
  await getClient().repos.createOrUpdateFileContents({
    ...getRepo(),
    path: filePath,
    message,
    content: content.toString('base64'),
    sha,
  });
}

export async function updateFileFromBase64(
  filePath: string,
  base64Content: string,
  message: string
): Promise<void> {
  const sha = await getFileSHA(filePath);
  await getClient().repos.createOrUpdateFileContents({
    ...getRepo(),
    path: filePath,
    message,
    content: base64Content,
    sha,
  });
}

export async function deleteProjectFolder(slug: string): Promise<void> {
  const folderPath = `projects/${slug}`;

  // Recursively list and delete all files in the folder
  async function deleteAll(dirPath: string): Promise<void> {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: dirPath });
    if (!Array.isArray(data)) return;

    for (const item of data) {
      if (item.type === 'dir') {
        await deleteAll(item.path);
      } else {
        await getClient().repos.deleteFile({
          ...getRepo(),
          path: item.path,
          message: `chore: delete project ${slug}`,
          sha: item.sha,
        });
      }
    }
  }

  await deleteAll(folderPath);
}

export async function getProjectSlugs(): Promise<string[]> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: 'projects' });
    if (Array.isArray(data)) {
      return data.filter((item) => item.type === 'dir').map((item) => item.name);
    }
    return [];
  } catch {
    return [];
  }
}
