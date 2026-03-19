import rateLimit from 'express-rate-limit';

// GET /projects — 60 requests per minute per IP
export const getProjectsLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// POST /projects — 10 uploads per minute per IP
export const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached, please wait before uploading again.' },
});

// GET /notifications — 120 requests per minute per IP
export const notificationsLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
