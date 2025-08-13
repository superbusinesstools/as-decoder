import express, { Express } from 'express';
import dotenv from 'dotenv';
import { initializeDatabase } from './db';
import queueRoutes from './routes/queue';
import processor from './services/processor';

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
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    processor.start();
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    processor.stop();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    processor.stop();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

export default app;