import { Router, Request, Response, NextFunction } from 'express';
import {
  createProject,
  updateProject,
  getProjects,
  getProjectMetadata,
  deleteProject,
  updateVisibility,
} from '../controllers/projectController';
import { upload } from '../middleware/upload';
import { requireAuth } from '../middleware/auth';
import { getProjectsLimiter, uploadLimiter } from '../middleware/rateLimiter';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(req: Request, res: Response, next: NextFunction): void {
  if (!SLUG_RE.test(req.params.slug)) {
    res.status(400).json({ error: 'Invalid slug format' });
    return;
  }
  next();
}

const router = Router();

router.get('/', requireAuth, getProjectsLimiter, getProjects);
router.post('/', requireAuth, uploadLimiter, upload.single('file'), createProject);
router.put('/:slug', requireAuth, uploadLimiter, validateSlug, upload.single('file'), updateProject);
router.get('/:slug/metadata', validateSlug, getProjectMetadata);
router.patch('/:slug/visibility', requireAuth, validateSlug, updateVisibility);
router.delete('/:slug', requireAuth, validateSlug, deleteProject);

export default router;
