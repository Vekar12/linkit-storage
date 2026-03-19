import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { randomBytes } from 'crypto';
import { ProjectMetadata, Visibility } from '../types';
import { generateSlug } from '../utils/slugUtils';
import {
  createProjectMetadata,
  getProjectsByOwner,
  getAllPublicProjects,
  getProjectBySlug,
  updateProjectMetadata,
  deleteProjectMetadata,
} from '../services/dbService';
import {
  uploadFile,
  getFileWithSHA,
  getFileBuffer,
  buildPagesUrl,
  deleteProjectFolder,
} from '../services/githubService';

// 8-char alphanumeric edit code, unambiguous characters
function generateEditCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(8)).map((b) => chars[b % chars.length]).join('');
}

// POST /projects
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawName: string = req.body.projectName ?? '';
    const projectName = rawName.replace(/<[^>]*>/g, '').replace(/[^\w\s\-().]/g, '').trim();
    const file = req.file;

    if (!projectName || !file) {
      res.status(400).json({ error: 'projectName and file are required' });
      return;
    }

    if (projectName.length > 100) {
      res.status(400).json({ error: 'projectName must be 100 characters or fewer' });
      return;
    }

    const slug = generateSlug(projectName);
    if (!slug) {
      res.status(400).json({ error: 'projectName must contain at least one letter or number' });
      return;
    }

    const rawVisibility = req.body.visibility;
    const visibility: Visibility = rawVisibility === 'public' ? 'public' : 'personal';

    const ownerId = req.user!.id;
    const ownerName = req.user!.name;

    // Collision check is now scoped per owner — two different users can share the same slug
    const existing = await getProjectBySlug(ownerId, slug);
    if (existing) {
      res.status(409).json({ error: 'You already have a project with this name' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const filename = `${slug}${ext}`;
    const filePath = `projects/${ownerId}/${slug}/${filename}`;
    const fileURL = buildPagesUrl(ownerId, slug, filename);

    await uploadFile(filePath, file.buffer, `feat: create project ${slug}`);
    const metadata = await createProjectMetadata(
      projectName, slug, filename,
      ext.replace('.', ''), fileURL, ownerId, visibility, ownerName
    );

    res.status(201).json({
      shareLink: `${process.env.FRONTEND_URL}/p/${ownerId}/${slug}`,
      ...metadata,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /projects/:slug — owner update, or non-owner collaborative update with editCode
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const requesterId = req.user!.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    // Non-owners pass the project owner's ID in the form body so we can look up the right project
    const OWNER_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;
    const bodyOwnerId = req.body.ownerId;
    const ownerId =
      bodyOwnerId && OWNER_ID_RE.test(bodyOwnerId) && bodyOwnerId !== requesterId
        ? bodyOwnerId
        : requesterId;

    const metadata = await getProjectBySlug(ownerId, slug);
    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Non-owner: must present a valid edit code and project must be public
    if (ownerId !== requesterId) {
      if (metadata.visibility !== 'public') {
        res.status(403).json({ error: 'Project is not open for collaboration' });
        return;
      }
      const { editCode } = req.body;
      if (!editCode || editCode !== metadata.editCode) {
        res.status(403).json({ error: 'Invalid or missing edit code' });
        return;
      }
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const newVersionNumber = metadata.versions.length + 1;
    const lastUpdatedByName = req.user!.name;

    // Fetch current file content+SHA in one call, then archive it
    const current = await getFileWithSHA(`projects/${ownerId}/${slug}/${metadata.currentFile}`);
    if (current) {
      const archivedName = `v${newVersionNumber - 1}_${metadata.currentFile}`;
      await uploadFile(
        `projects/${ownerId}/${slug}/versions/${archivedName}`,
        Buffer.from(current.content, 'base64'),
        `chore: archive v${newVersionNumber - 1} of ${slug}`,
        undefined
      );

      const newFilename = `${slug}${ext}`;
      const newFilePath = `projects/${ownerId}/${slug}/${newFilename}`;
      const newFileURL = buildPagesUrl(ownerId, slug, newFilename);
      const useSha = newFilename === metadata.currentFile ? current.sha : undefined;

      await uploadFile(newFilePath, file.buffer, `feat: update ${slug} to v${newVersionNumber}`, useSha);

      const updated = await updateProjectMetadata(ownerId, slug, {
        fileType: ext.replace('.', ''),
        currentFile: newFilename,
        lastUpdatedByName,
        versions: [
          ...metadata.versions,
          { version: newVersionNumber, filename: newFilename, fileURL: newFileURL, uploadedAt: new Date().toISOString() },
        ],
      });

      res.status(200).json({ message: 'Project updated successfully', ...updated });
      return;
    }

    // Fallback: current file not found in GitHub, just upload the new version
    const newFilename = `${slug}${ext}`;
    const newFilePath = `projects/${ownerId}/${slug}/${newFilename}`;
    const newFileURL = buildPagesUrl(ownerId, slug, newFilename);

    await uploadFile(newFilePath, file.buffer, `feat: update ${slug} to v${newVersionNumber}`);

    const updated = await updateProjectMetadata(ownerId, slug, {
      fileType: ext.replace('.', ''),
      currentFile: newFilename,
      lastUpdatedByName,
      versions: [
        ...metadata.versions,
        { version: newVersionNumber, filename: newFilename, fileURL: newFileURL, uploadedAt: new Date().toISOString() },
      ],
    });

    res.status(200).json({ message: 'Project updated successfully', ...updated });
  } catch (err) {
    next(err);
  }
}

// PUT /projects/:ownerId/:slug — collaborative update (non-owner with edit code, or owner)
export async function collaboratorUpdateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ownerId, slug } = req.params;
    const requesterId = req.user!.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    const metadata = await getProjectBySlug(ownerId, slug);
    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const isOwner = requesterId === ownerId;

    if (!isOwner) {
      if (metadata.visibility !== 'public') {
        res.status(403).json({ error: 'Project is not open for collaboration' });
        return;
      }
      const { editCode } = req.body;
      if (!editCode || editCode !== metadata.editCode) {
        res.status(403).json({ error: 'Invalid or missing edit code' });
        return;
      }
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const newVersionNumber = metadata.versions.length + 1;
    const lastUpdatedByName = req.user!.name;

    const current = await getFileWithSHA(`projects/${ownerId}/${slug}/${metadata.currentFile}`);
    if (current) {
      const archivedName = `v${newVersionNumber - 1}_${metadata.currentFile}`;
      await uploadFile(
        `projects/${ownerId}/${slug}/versions/${archivedName}`,
        Buffer.from(current.content, 'base64'),
        `chore: archive v${newVersionNumber - 1} of ${slug}`,
        undefined
      );

      const newFilename = `${slug}${ext}`;
      const newFilePath = `projects/${ownerId}/${slug}/${newFilename}`;
      const newFileURL = buildPagesUrl(ownerId, slug, newFilename);
      const useSha = newFilename === metadata.currentFile ? current.sha : undefined;

      await uploadFile(newFilePath, file.buffer, `feat: update ${slug} to v${newVersionNumber}`, useSha);

      const updated = await updateProjectMetadata(ownerId, slug, {
        fileType: ext.replace('.', ''),
        currentFile: newFilename,
        lastUpdatedByName,
        versions: [
          ...metadata.versions,
          { version: newVersionNumber, filename: newFilename, fileURL: newFileURL, uploadedAt: new Date().toISOString() },
        ],
      });

      res.status(200).json({ message: 'Project updated successfully', ...updated });
      return;
    }

    // Fallback: current file not found in GitHub
    const newFilename = `${slug}${ext}`;
    const newFilePath = `projects/${ownerId}/${slug}/${newFilename}`;
    const newFileURL = buildPagesUrl(ownerId, slug, newFilename);

    await uploadFile(newFilePath, file.buffer, `feat: update ${slug} to v${newVersionNumber}`);

    const updated = await updateProjectMetadata(ownerId, slug, {
      fileType: ext.replace('.', ''),
      currentFile: newFilename,
      lastUpdatedByName,
      versions: [
        ...metadata.versions,
        { version: newVersionNumber, filename: newFilename, fileURL: newFileURL, uploadedAt: new Date().toISOString() },
      ],
    });

    res.status(200).json({ message: 'Project updated successfully', ...updated });
  } catch (err) {
    next(err);
  }
}

// GET /projects — returns only the requesting user's projects (includes editCode)
export async function getProjects(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await getProjectsByOwner(req.user!.id);
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

// GET /projects/:ownerId/:slug/metadata — public endpoint for share page
export async function getProjectMetadata(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ownerId, slug } = req.params;
    const metadata = await getProjectBySlug(ownerId, slug);

    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const cb = new Date(metadata.updatedAt).getTime();
    res.status(200).json({
      fileType: metadata.fileType,
      fileURL: `${buildPagesUrl(ownerId, slug, metadata.currentFile)}?_cb=${cb}`,
      visibility: metadata.visibility ?? 'personal',
      versions: metadata.versions,
    });
  } catch (err) {
    next(err);
  }
}

const MIME_MAP: Record<string, string> = {
  html: 'text/html',
  md:   'text/markdown',
  pdf:  'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

// GET /projects/:ownerId/:slug/download?version=N — proxy file, supports version history
export async function downloadProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { ownerId, slug } = req.params;
    const metadata = await getProjectBySlug(ownerId, slug);

    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const latestVersion = metadata.versions[metadata.versions.length - 1]?.version ?? 1;
    const requestedVersion = req.query.version !== undefined
      ? parseInt(String(req.query.version), 10)
      : latestVersion;

    if (isNaN(requestedVersion) || requestedVersion < 1) {
      res.status(400).json({ error: 'version must be a positive integer' });
      return;
    }

    const versionEntry = metadata.versions.find((v) => v.version === requestedVersion);
    if (!versionEntry) {
      res.status(404).json({ error: `Version ${requestedVersion} not found` });
      return;
    }

    // Latest version lives at the root of the project folder;
    // older versions are archived under versions/v{N}_{filename}
    const isLatest = requestedVersion === latestVersion;
    const filePath = isLatest
      ? `projects/${ownerId}/${slug}/${metadata.currentFile}`
      : `projects/${ownerId}/${slug}/versions/v${requestedVersion}_${versionEntry.filename}`;

    const downloadFilename = isLatest
      ? metadata.currentFile
      : `v${requestedVersion}_${versionEntry.filename}`;

    const buffer = await getFileBuffer(filePath);

    if (!buffer) {
      res.status(404).json({ error: 'File not found in storage' });
      return;
    }

    // Use octet-stream for all downloads — correct MIME types (text/html etc.) cause
    // browsers to render rather than download, especially for cross-origin <a> links
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
}

// GET /projects/public — all public projects across all users
export async function getPublicProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await getAllPublicProjects();
    res.status(200).json(projects);
  } catch (err) {
    next(err);
  }
}

// PATCH /projects/:slug — update projectName, visibility, and/or regenerate edit code
export async function updateVisibility(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const ownerId = req.user!.id;
    const { visibility, projectName: rawName, regenerateCode } = req.body;

    // Validate fields — at least one must be present
    if (visibility === undefined && rawName === undefined && !regenerateCode) {
      res.status(400).json({ error: 'Provide at least one of: visibility, projectName, regenerateCode' });
      return;
    }

    const updates: Partial<ProjectMetadata> = {};

    if (visibility !== undefined) {
      if (visibility !== 'personal' && visibility !== 'public') {
        res.status(400).json({ error: 'visibility must be "personal" or "public"' });
        return;
      }
      updates.visibility = visibility as Visibility;
    }

    if (rawName !== undefined) {
      const projectName = String(rawName).replace(/<[^>]*>/g, '').replace(/[^\w\s\-().]/g, '').trim();
      if (!projectName) {
        res.status(400).json({ error: 'projectName cannot be empty' });
        return;
      }
      if (projectName.length > 100) {
        res.status(400).json({ error: 'projectName must be 100 characters or fewer' });
        return;
      }
      updates.projectName = projectName;
    }

    const metadata = await getProjectBySlug(ownerId, slug);
    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Generate edit code when explicitly requested, or when first setting to public
    if (regenerateCode) {
      updates.editCode = generateEditCode();
    } else if (updates.visibility === 'public' && !metadata.editCode) {
      updates.editCode = generateEditCode();
    }

    const updated = await updateProjectMetadata(ownerId, slug, updates);
    res.status(200).json({ ...(updated ?? metadata), ...updates });
  } catch (err) {
    next(err);
  }
}

// DELETE /projects/:slug
export async function deleteProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const ownerId = req.user!.id;
    const metadata = await getProjectBySlug(ownerId, slug);

    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await deleteProjectFolder(ownerId, slug);
    await deleteProjectMetadata(ownerId, slug);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}
