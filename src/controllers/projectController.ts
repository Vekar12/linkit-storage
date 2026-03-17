import { Request, Response, NextFunction } from 'express';
import { generateSlug } from '../utils/slugUtils';
import {
  createProject,
  getProjects,
  getProjectById,
  deleteProject,
  getFilePathsByProject,
} from '../services/dbService';
import { deleteFilesFromGitHub } from '../services/githubService';

function parsePagination(query: Record<string, unknown>) {
  return {
    page: Math.max(1, parseInt(String(query.page || 1))),
    limit: Math.min(50, Math.max(1, parseInt(String(query.limit || 20)))),
  };
}

// POST /projects
export async function createProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const slug = generateSlug(name);
    const project = await createProject(name, slug);
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
}

// GET /projects
export async function getProjectsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await getProjects(parsePagination(req.query));
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// GET /projects/:id
export async function getProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }
    res.status(200).json(project);
  } catch (err) {
    next(err);
  }
}

// DELETE /projects/:id
export async function deleteProjectHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const project = await getProjectById(id);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const paths = await getFilePathsByProject(id);
    await deleteFilesFromGitHub(paths, id);
    await deleteProject(id); // cascades to files in DB

    res.status(200).json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
}
