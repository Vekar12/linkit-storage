import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { generateSlug } from '../utils/slugUtils';
import {
  createFile,
  createFileFromBase64,
  updateFile,
  updateFileFromBase64,
  getFileContentBase64,
  getFileContentText,
  getProjectSlugs,
  deleteProjectFolder,
  ProjectMetadata,
  VersionEntry,
} from '../services/githubService';

const GITHUB_PAGES_BASE = `https://${process.env.GITHUB_OWNER}.github.io/${process.env.GITHUB_REPO}`;
const SHARE_LINK_BASE = 'https://linkit.app/p';

function buildFileURL(slug: string, filename: string): string {
  return `${GITHUB_PAGES_BASE}/projects/${slug}/${filename}`;
}

// POST /projects
export async function createProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { projectName } = req.body;
    const file = req.file;

    if (!projectName || !file) {
      res.status(400).json({ error: 'projectName and file are required' });
      return;
    }

    const slug = generateSlug(projectName);
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${slug}${ext}`;
    const now = new Date().toISOString();

    const filePath = `projects/${slug}/${filename}`;
    const metaPath = `projects/${slug}/metadata.json`;

    const versionEntry: VersionEntry = {
      version: 1,
      filename,
      fileURL: buildFileURL(slug, filename),
      uploadedAt: now,
    };

    const metadata: ProjectMetadata = {
      projectName,
      slug,
      fileType: ext.replace('.', ''),
      currentFile: filename,
      createdAt: now,
      updatedAt: now,
      versions: [versionEntry],
    };

    await createFile(filePath, file.buffer, `feat: create project ${slug}`);
    await createFile(
      metaPath,
      Buffer.from(JSON.stringify(metadata, null, 2)),
      `feat: add metadata for ${slug}`
    );

    res.status(201).json({
      slug,
      shareLink: `${SHARE_LINK_BASE}/${slug}`,
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
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    const metaPath = `projects/${slug}/metadata.json`;
    const rawMeta = await getFileContentText(metaPath);

    if (!rawMeta) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const metadata: ProjectMetadata = JSON.parse(rawMeta);
    const now = new Date().toISOString();
    const ext = path.extname(file.originalname).toLowerCase();
    const newVersionNumber = metadata.versions.length + 1;

    // Archive the current file into versions/ before overwriting
    const currentFilePath = `projects/${slug}/${metadata.currentFile}`;
    const currentBase64 = await getFileContentBase64(currentFilePath);

    if (currentBase64) {
      const archivedFilename = `v${newVersionNumber - 1}_${metadata.currentFile}`;
      await createFileFromBase64(
        `projects/${slug}/versions/${archivedFilename}`,
        currentBase64,
        `chore: archive version ${newVersionNumber - 1} of ${slug}`
      );
    }

    // Replace current file with the new upload
    const newFilename = `${slug}${ext}`;
    const newFilePath = `projects/${slug}/${newFilename}`;
    await updateFile(newFilePath, file.buffer, `feat: update ${slug} to version ${newVersionNumber}`);

    // Append new version entry to history
    const versionEntry: VersionEntry = {
      version: newVersionNumber,
      filename: newFilename,
      fileURL: buildFileURL(slug, newFilename),
      uploadedAt: now,
    };

    metadata.updatedAt = now;
    metadata.fileType = ext.replace('.', '');
    metadata.currentFile = newFilename;
    metadata.versions.push(versionEntry);

    await updateFile(
      metaPath,
      Buffer.from(JSON.stringify(metadata, null, 2)),
      `chore: update metadata for ${slug}`
    );

    res.status(200).json({ message: 'Project updated successfully' });
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

    const raw = await getFileContentText(`projects/${slug}/metadata.json`);
    if (!raw) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    await deleteProjectFolder(slug);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /projects
export async function getProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const slugs = await getProjectSlugs();

    const projects = await Promise.all(
      slugs.map(async (slug) => {
        const raw = await getFileContentText(`projects/${slug}/metadata.json`);
        return raw ? JSON.parse(raw) : null;
      })
    );

    res.status(200).json(projects.filter(Boolean));
  } catch (err) {
    next(err);
  }
}

// GET /projects/:slug/metadata
export async function getProjectMetadata(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { slug } = req.params;
    const raw = await getFileContentText(`projects/${slug}/metadata.json`);

    if (!raw) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const metadata: ProjectMetadata = JSON.parse(raw);

    res.status(200).json({
      fileType: metadata.fileType,
      fileURL: buildFileURL(slug, metadata.currentFile),
      versions: metadata.versions,
    });
  } catch (err) {
    next(err);
  }
}
