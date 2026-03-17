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

export function buildRawUrl(path: string): string {
  return `https://raw.githubusercontent.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/main/${path}`;
}

async function getFileSHA(path: string): Promise<string | undefined> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path });
    if (!Array.isArray(data) && 'sha' in data) return data.sha;
  } catch {
    return undefined;
  }
}

export async function uploadFile(
  path: string,
  content: Buffer,
  message: string
): Promise<void> {
  const sha = await getFileSHA(path);
  await getClient().repos.createOrUpdateFileContents({
    ...getRepo(),
    path,
    message,
    content: content.toString('base64'),
    ...(sha && { sha }),
  });
}

export async function deleteFile(path: string, message: string): Promise<void> {
  const sha = await getFileSHA(path);
  if (!sha) return;
  await getClient().repos.deleteFile({ ...getRepo(), path, message, sha });
}

export async function deleteFilesFromGitHub(
  paths: string[],
  projectId: string
): Promise<void> {
  await Promise.allSettled(
    paths.map((p) => deleteFile(p, `chore: delete file from project ${projectId}`))
  );
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────

export async function readJSON<T>(path: string): Promise<T | null> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path });
    if (!Array.isArray(data) && 'content' in data) {
      return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) as T;
    }
    return null;
  } catch {
    return null;
  }
}

export async function writeJSON(
  path: string,
  data: unknown,
  message: string
): Promise<void> {
  await uploadFile(path, Buffer.from(JSON.stringify(data, null, 2)), message);
}

export async function listProjectIds(): Promise<string[]> {
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
