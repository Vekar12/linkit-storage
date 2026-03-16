import multer from 'multer';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.html', '.pdf', '.png', '.jpg', '.zip'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
  },
});
