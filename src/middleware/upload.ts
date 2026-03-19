import multer from 'multer';
import path from 'path';

const ALLOWED_EXTENSIONS = ['.html', '.md', '.pdf', '.pptx'];
const ALLOWED_MIME_TYPES = ['text/html', 'text/markdown', 'application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExt = ALLOWED_EXTENSIONS.includes(ext);
    const validMime = ALLOWED_MIME_TYPES.includes(file.mimetype);
    if (validExt && validMime) {
      cb(null, true);
    } else {
      cb(new Error('Only HTML, Markdown, PDF, and PPTX files are allowed'));
    }
  },
});
