import { Router, Request, Response, NextFunction } from 'express';
import {
  createProject,
  updateProject,
  getProjects,
  getPublicProjects,
  getProjectMetadata,
  downloadProject,
  deleteProject,
  updateVisibility,
} from '../controllers/projectController';
import { upload } from '../middleware/upload';
import { requireAuth } from '../middleware/auth';
import { getProjectsLimiter, uploadLimiter } from '../middleware/rateLimiter';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const OWNER_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

function validateSlug(req: Request, res: Response, next: NextFunction): void {
  if (!SLUG_RE.test(req.params.slug)) {
    res.status(400).json({ error: 'Invalid slug format' });
    return;
  }
  next();
}

function validateOwnerId(req: Request, res: Response, next: NextFunction): void {
  if (!OWNER_ID_RE.test(req.params.ownerId)) {
    res.status(400).json({ error: 'Invalid owner ID' });
    return;
  }
  next();
}

const router = Router();

// Public routes — must be declared before dynamic /:slug routes
router.get('/public', getProjectsLimiter, getPublicProjects);

// Authenticated routes — ownerId derived from token, not the URL
router.get('/', requireAuth, getProjectsLimiter, getProjects);
router.post('/', requireAuth, uploadLimiter, upload.single('file'), createProject);
router.put('/:slug', requireAuth, uploadLimiter, validateSlug, upload.single('file'), updateProject);
router.patch('/:slug', requireAuth, validateSlug, updateVisibility);
router.delete('/:slug', requireAuth, validateSlug, deleteProject);

// Public routes — ownerId is part of the URL for share-page resolution
router.get('/:ownerId/:slug/metadata', validateOwnerId, validateSlug, getProjectMetadata);
router.get('/:ownerId/:slug/download', validateOwnerId, validateSlug, downloadProject);

export default router;
