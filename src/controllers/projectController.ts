import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { generateSlug } from '../utils/slugUtils';
import {
  createProjectMetadata,
  getAllProjects,
  getProjectBySlug,
  updateProjectMetadata,
  deleteProjectMetadata,
} from '../services/dbService';
import {
  uploadFile,
  getFileContentBase64,
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
    const { projectName } = req.body;
    const file = req.file;

    if (!projectName || !file) {
      res.status(400).json({ error: 'projectName and file are required' });
      return;
    }

    const slug = generateSlug(projectName);
    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const filename = `${slug}${ext}`;
    const filePath = `projects/${slug}/${filename}`;
    const fileURL = buildPagesUrl(slug, filename);
    const ownerId = req.user!.id;

    await uploadFile(filePath, file.buffer, `feat: create project ${slug}`);
    const metadata = await createProjectMetadata(
      projectName, slug, filename,
      ext.replace('.', ''), fileURL, ownerId
    );

    res.status(201).json({
      shareLink: `${process.env.FRONTEND_URL}/p/${slug}`,
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
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    const metadata = await getProjectBySlug(slug);
    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.html';
    const newVersionNumber = metadata.versions.length + 1;

    // Archive current file to versions/
    const currentBase64 = await getFileContentBase64(`projects/${slug}/${metadata.currentFile}`);
    if (currentBase64) {
      const archivedName = `v${newVersionNumber - 1}_${metadata.currentFile}`;
      const archivePath = `projects/${slug}/versions/${archivedName}`;
      await uploadFile(
        archivePath,
        Buffer.from(currentBase64, 'base64'),
        `chore: archive v${newVersionNumber - 1} of ${slug}`
      );
    }

    // Upload new file
    const newFilename = `${slug}${ext}`;
    const newFilePath = `projects/${slug}/${newFilename}`;
    const newFileURL = buildPagesUrl(slug, newFilename);

    await uploadFile(newFilePath, file.buffer, `feat: update ${slug} to v${newVersionNumber}`);

    const updated = await updateProjectMetadata(slug, {
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

// GET /projects
export async function getProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await getAllProjects();
    res.status(200).json(projects);
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
    const metadata = await getProjectBySlug(slug);

    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(200).json({
      fileType: metadata.fileType,
      fileURL: buildPagesUrl(slug, metadata.currentFile),
      versions: metadata.versions,
    });
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
    const metadata = await getProjectBySlug(slug);

    if (!metadata) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (metadata.ownerId && metadata.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Forbidden: you do not own this project' });
      return;
    }

    await deleteProjectFolder(slug);
    await deleteProjectMetadata(slug);

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}
