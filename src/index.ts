import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import projectRoutes from './routes/projectRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Render's proxy so rate limiter sees real client IPs
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://linkit-storage.vercel.app',
  'http://localhost:3001',
];

app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  allowedHeaders: ['Authorization', 'Content-Type'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use('/projects', projectRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`LinkIt backend running on port ${PORT}`);
});

// Graceful shutdown: drain in-flight requests before exit
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});

export default app;
