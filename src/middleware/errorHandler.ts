import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ error: 'File exceeds the 15MB limit' });
    return;
  }

  if (err.message?.startsWith('Unsupported file type')) {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
}
