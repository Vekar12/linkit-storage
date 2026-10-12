import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://linkit-backend-tuj9.onrender.com';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const response = await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(10000) });
    const data = await response.json();
    res.status(200).json({ backend: data.status, pingedAt: new Date().toISOString() });
  } catch {
    res.status(200).json({ backend: 'unreachable', pingedAt: new Date().toISOString() });
  }
}
