import { Request, Response, NextFunction } from 'express';
import path from 'path';
import {
  createFileRecord,
  getFilesByProject,
  getFileById,
  deleteFileRecord,
  getProjectById,
  updateProjectTimestamp,
} from '../services/dbService';
import { uploadFile, deleteFile, buildRawUrl } from '../services/githubService';

function parsePagination(query: Record<string, unknown>) {
  return {
    page: Math.max(1, parseInt(String(query.page || 1))),
    limit: Math.min(50, Math.max(1, parseInt(String(query.limit || 20)))),
  };
}

// POST /projects/:id/files
export async function uploadFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: projectId } = req.params;
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'file is required' });
      return;
    }

    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${file.originalname}`;
    const githubPath = `projects/${projectId}/${uniqueName}`;
    const githubUrl = buildRawUrl(githubPath);

    // Upload to GitHub — async, no blocking
    await uploadFile(githubPath, file.buffer, `feat: upload ${uniqueName}`);

    // Store metadata only — no file content in DB
    const fileRecord = await createFileRecord({
      project_id: projectId,
      name: file.originalname,
      type: ext.replace('.', ''),
      github_url: githubUrl,
      github_path: githubPath,
      size: file.size,
    });

    await updateProjectTimestamp(projectId);

    res.status(201).json(fileRecord);
  } catch (err) {
    next(err);
  }
}

// GET /projects/:id/files
export async function getFilesHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id: projectId } = req.params;

    const project = await getProjectById(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const result = await getFilesByProject(projectId, parsePagination(req.query));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /files/:id/download — redirect to GitHub raw URL, no proxying
export async function downloadFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = await getFileById(req.params.id);
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }
    res.redirect(file.github_url);
  } catch (err) {
    next(err);
  }
}

// DELETE /files/:id
export async function deleteFileHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = await getFileById(req.params.id);
    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    await deleteFile(file.github_path, `chore: delete ${file.name}`);
    await deleteFileRecord(file.id);

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    next(err);
  }
}
