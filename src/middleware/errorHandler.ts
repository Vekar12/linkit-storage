import { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';

const isDev = process.env.NODE_ENV !== 'production';

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

  if (err.message === 'Only HTML, Markdown, PDF, and PPTX files are allowed') {
    res.status(400).json({ error: err.message });
    return;
  }

  console.error(err);

  // Never expose internal error details in production
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { details: err.message }),
  });
}
