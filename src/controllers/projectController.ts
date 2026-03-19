import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { Visibility } from '../types';
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
      ext.replace('.', ''), fileURL, ownerId, visibility
    );

    res.status(201).json({
      shareLink: `${process.env.FRONTEND_URL}/p/${ownerId}/${slug}`,
      ...metadata,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /projects/:slug
export async function updateProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const ownerId = req.user!.id;
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

    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const newVersionNumber = metadata.versions.length + 1;

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

// GET /projects — returns only the requesting user's projects
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

// GET /projects/:ownerId/:slug/download — proxy file to avoid CORS on raw.githubusercontent.com
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

    const filePath = `projects/${ownerId}/${slug}/${metadata.currentFile}`;
    const buffer = await getFileBuffer(filePath);

    if (!buffer) {
      res.status(404).json({ error: 'File not found in storage' });
      return;
    }

    const contentType = MIME_MAP[metadata.fileType] ?? 'application/octet-stream';

    res.setHeader('Content-Disposition', `attachment; filename="${metadata.currentFile}"`);
    res.setHeader('Content-Type', contentType);
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

// PATCH /projects/:slug/visibility
export async function updateVisibility(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const ownerId = req.user!.id;
    const { visibility } = req.body;

    if (visibility !== 'personal' && visibility !== 'public') {
      res.status(400).json({ error: 'visibility must be "personal" or "public"' });
      return;
    }

    const metadata = await getProjectBySlug(ownerId, slug);
    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const updated = await updateProjectMetadata(ownerId, slug, { visibility });
    res.status(200).json({ message: 'Visibility updated', ...updated });
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
