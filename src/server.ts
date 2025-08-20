import express, { Express } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { initializeDatabase } from './db';
import queueRoutes from './routes/queue';
import processor from './services/processor';
import { authMiddleware, authPageMiddleware } from './middleware/auth';
import { jsonDetectionMiddleware } from './middleware/jsonDetection';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 20080;

// TODO: Remove jsonDetectionMiddleware once Twenty fixes their webhook Content-Type headers
// Custom middleware to handle JSON content sent with incorrect Content-Type headers
app.use(jsonDetectionMiddleware);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory (except status.html)
const publicPath = path.join(__dirname, '..', 'public');
console.log('Serving static files from:', publicPath);

// Protect status.html with auth
app.get('/status.html', authPageMiddleware, (_req, res) => {
  res.sendFile(path.join(publicPath, 'status.html'));
});

// Serve other static files without auth
app.use(express.static(publicPath, {
  index: false // Don't serve index.html automatically
}));

// Redirect root to status.html
app.get('/', (_req, res) => {
  res.redirect('/status.html');
});

initializeDatabase();

// Health endpoint doesn't need auth
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply auth middleware to all /api routes except health
app.use('/api', authMiddleware, queueRoutes);

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