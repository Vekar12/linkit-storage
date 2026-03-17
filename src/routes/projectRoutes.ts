import { Router } from 'express';
import {
  createProject,
  updateProject,
  getProjects,
  getProjectMetadata,
  deleteProject,
} from '../controllers/projectController';
import { upload } from '../middleware/upload';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getProjects);
router.post('/', requireAuth, upload.single('file'), createProject);
router.put('/:slug', requireAuth, upload.single('file'), updateProject);
router.get('/:slug/metadata', getProjectMetadata);
router.delete('/:slug', requireAuth, deleteProject);

export default router;
