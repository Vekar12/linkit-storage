import { Router } from 'express';
import {
  uploadFileHandler,
  getFilesHandler,
  downloadFileHandler,
  deleteFileHandler,
} from '../controllers/fileController';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/projects/:id/files', upload.single('file'), uploadFileHandler);
router.get('/projects/:id/files', getFilesHandler);
router.get('/files/:id/download', downloadFileHandler);
router.delete('/files/:id', deleteFileHandler);

export default router;
