import express, { Express } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';
import queueRoutes from './routes/queue';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 20080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initializeDatabase();

app.use('/api', queueRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;