import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { initDatabase, seedDatabase, closeDatabase } from './db/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
import eventsRouter from './routes/events.js';
import testsRouter from './routes/tests.js';
import analyticsRouter from './routes/analytics.js';
import projectsRouter from './routes/projects.js';

const PORT = process.env.PORT || 3001;

// Create Express app
const app = express();

// Middleware - Allow all origins for development/testing
app.use(cors({
  origin: true,  // Allow any origin (including file://)
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Serve SDK file (from local dev or copied public folder)
const sdkPaths = [
  join(__dirname, '../public/sdk'),  // Production (copied files)
  join(__dirname, '../../sdk/dist')   // Development (direct source)
];
for (const p of sdkPaths) {
  app.use('/sdk', express.static(p));
}

// Routes
app.use('/events', eventsRouter);
app.use('/tests', testsRouter);
app.use('/analytics', analyticsRouter);
app.use('/projects', projectsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize and start
async function start() {
  try {
    await initDatabase();
    await seedDatabase();
    
    const server = app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════╗
║           UXTest Backend Server                   ║
╠═══════════════════════════════════════════════════╣
║  Status:    Running                               ║
║  Port:      ${PORT}                                  ║
║  Endpoints:                                       ║
║    POST /events         - Batch event ingestion   ║
║    GET  /tests          - List tests              ║
║    GET  /tests/:id      - Get test config         ║
║    GET  /analytics/:id  - Get test analytics      ║
║    GET  /projects       - List projects           ║
╚═══════════════════════════════════════════════════╝
      `);
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      server.close(() => {
        closeDatabase();
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      server.close(() => {
        closeDatabase();
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
