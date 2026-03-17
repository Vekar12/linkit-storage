import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import projectRoutes from './routes/projectRoutes';
import fileRoutes from './routes/fileRoutes';
import authRoutes from './routes/authRoutes';
import { errorHandler } from './middleware/errorHandler';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/projects', projectRoutes);
app.use('/', fileRoutes);
app.use('/auth', authRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`LinkIt backend running on port ${PORT}`);
});

export default app;
