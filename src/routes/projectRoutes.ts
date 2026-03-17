import { Router } from 'express';
import {
  createProjectHandler,
  getProjectsHandler,
  getProjectHandler,
  deleteProjectHandler,
} from '../controllers/projectController';

const router = Router();

router.post('/', createProjectHandler);
router.get('/', getProjectsHandler);
router.get('/:id', getProjectHandler);
router.delete('/:id', deleteProjectHandler);

export default router;
