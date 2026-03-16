import { Router } from 'express';
import {
  createProject,
  updateProject,
  getProjects,
  getProjectMetadata,
  deleteProject,
} from '../controllers/projectController';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/', upload.single('file'), createProject);
router.put('/:slug', upload.single('file'), updateProject);
router.get('/', getProjects);
router.get('/:slug/metadata', getProjectMetadata);
router.delete('/:slug', deleteProject);

export default router;
