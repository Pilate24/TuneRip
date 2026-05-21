require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const { cleanupTempFiles } = require('./utils/ytdlp');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'DELETE'],
  },
  // Increase timeouts for large downloads
  pingTimeout: 120000,
  pingInterval: 25000,
});

// Store io on app for access from routes
app.set('io', io);

// Pass io to routes via middleware
app.use((req, res, next) => {
  req.io = io;
  next();
});

const PORT = process.env.PORT || 5000;
const os = require('os');

// Ensure temp directory exists
const TEMP_DIR = process.env.TEMP_DIR || path.join(os.tmpdir(), 'tunerip-temp');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Security
app.use(helmet({
  crossOriginResourcePolicy: false,
}));

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Rate limiting removed for unlimited downloads
// app.use('/api/', limiter);
// app.use('/api/download', downloadLimiter);

// API routes
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// Health check
app.get('/', (req, res) => {
  res.json({
    name: 'TuneRip API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      info: 'GET /api/info?url=',
      download: 'POST /api/download',
      progress: 'GET /api/progress/:jobId',
      file: 'GET /api/file/:jobId',
      playlistDownload: 'POST /api/playlist-download',
      search: 'GET /api/search?q=',
      health: 'GET /api/health',
      cancel: 'DELETE /api/download/:jobId',
      retry: 'POST /api/retry/:jobId',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server logic
function startServer(port = PORT) {
  return new Promise((resolve, reject) => {
    server.listen(port, () => {
      const assignedPort = server.address().port;
      console.log(`\n🎵 TuneRip API v2.0 running on http://localhost:${assignedPort}`);
      console.log(`📁 Temp dir: ${TEMP_DIR}`);
      console.log(`🌍 CORS: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`♾️  Unlimited downloads enabled\n`);
      resolve(assignedPort);
    }).on('error', reject);
  });
}

// Start server if run directly
if (require.main === module) {
  startServer();
}

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send current active jobs status on connect
  socket.on('request-status', (jobIds) => {
    if (!Array.isArray(jobIds)) return;
    const jobs = apiRouter.getJobs ? apiRouter.getJobs() : null;
    if (jobs) {
      jobIds.forEach((jobId) => {
        const job = jobs.get(jobId);
        if (job) {
          socket.emit('progress', {
            jobId,
            status: job.status,
            progress: job.progress,
            title: job.title,
            thumbnail: job.thumbnail,
            error: job.error,
          });
        }
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Cleanup old temp files every 10 minutes
setInterval(cleanupTempFiles, 10 * 60 * 1000);
// Run cleanup on startup
cleanupTempFiles();

module.exports = { app, server, io, startServer };
