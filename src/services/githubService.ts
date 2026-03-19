import { Octokit } from '@octokit/rest';
import axios from 'axios';

// Singleton — one client for the lifetime of the process
let _client: Octokit | null = null;
function getClient(): Octokit {
  if (!_client) _client = new Octokit({ auth: process.env.GITHUB_TOKEN });
  return _client;
}

function getRepo() {
  return {
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!,
  };
}

export function buildPagesUrl(ownerId: string, slug: string, filename: string): string {
  return `https://${process.env.GITHUB_OWNER}.github.io/${process.env.GITHUB_REPO}/projects/${ownerId}/${slug}/${filename}`;
}

async function getFileSHA(path: string): Promise<string | undefined> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path });
    if (!Array.isArray(data) && 'sha' in data) return data.sha;
    return undefined;
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return undefined;
    throw err; // rate limits, network errors — must not be silenced
  }
}

export async function uploadFile(
  path: string,
  content: Buffer,
  message: string,
  knownSha?: string
): Promise<void> {
  const sha = knownSha ?? await getFileSHA(path);
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

// Returns both content and SHA to avoid a redundant getFileSHA call on update
export async function getFileWithSHA(
  path: string
): Promise<{ content: string; sha: string } | null> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path });
    if (!Array.isArray(data) && 'content' in data && 'sha' in data) {
      return {
        content: data.content.replace(/[\r\n]/g, ''),
        sha: data.sha,
      };
    }
    return null;
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function readJSON<T>(path: string): Promise<T | null> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path });
    if (!Array.isArray(data) && 'content' in data) {
      return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8')) as T;
    }
    return null;
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

// Fetches the raw file content as a Buffer.
// For files ≤ 1 MB the GitHub Content API returns base64 directly.
// For larger files it returns a download_url — we fetch that instead.
export async function getFileBuffer(filePath: string): Promise<Buffer | null> {
  try {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: filePath });
    if (Array.isArray(data)) return null;

    if ('content' in data && data.content) {
      return Buffer.from(data.content.replace(/[\r\n]/g, ''), 'base64');
    }

    if ('download_url' in data && data.download_url) {
      const response = await axios.get<ArrayBuffer>(data.download_url, {
        responseType: 'arraybuffer',
        headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` },
      });
      return Buffer.from(response.data);
    }

    return null;
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function writeJSON(
  path: string,
  data: unknown,
  message: string
): Promise<void> {
  await uploadFile(path, Buffer.from(JSON.stringify(data, null, 2)), message);
}

// Lists all owner directories under projects/
export async function listAllOwners(): Promise<string[]> {
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

// Lists slug directories under projects/{ownerId}/
export async function listProjectSlugsForOwner(ownerId: string): Promise<string[]> {
  try {
    const { data } = await getClient().repos.getContent({
      ...getRepo(),
      path: `projects/${ownerId}`,
    });
    if (Array.isArray(data)) {
      return data.filter((item) => item.type === 'dir').map((item) => item.name);
    }
    return [];
  } catch {
    return [];
  }
}

export async function deleteProjectFolder(ownerId: string, slug: string): Promise<void> {
  async function deleteAll(dirPath: string): Promise<void> {
    const { data } = await getClient().repos.getContent({ ...getRepo(), path: dirPath });
    if (!Array.isArray(data)) return;
    await Promise.all(
      data.map((item) =>
        item.type === 'dir'
          ? deleteAll(item.path)
          : getClient().repos.deleteFile({
              ...getRepo(),
              path: item.path,
              message: `chore: delete project ${slug}`,
              sha: item.sha,
            })
      )
    );
  }
  await deleteAll(`projects/${ownerId}/${slug}`);
}
