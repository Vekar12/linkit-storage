import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import projectRoutes from './routes/projectRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://linkit-storage.vercel.app',
  'http://localhost:3001',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
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

app.use(morgan('dev'));
app.use(express.json());

app.use('/projects', projectRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`LinkIt backend running on port ${PORT}`);
});

export default app;
