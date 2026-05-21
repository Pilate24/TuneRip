const express = require('express');
const router = express.Router();
const { randomUUID: uuidv4 } = require('crypto');
const path = require('path');
const fs = require('fs');
const {
  getVideoInfo,
  getPlaylistInfo,
  downloadAudio,
  searchYouTube,
  TEMP_DIR,
} = require('../utils/ytdlp');

// In-memory job store (use Redis in production)
const jobs = new Map();

// Track active concurrent downloads (no hard limit — truly unlimited)
let activeDownloads = 0;

/**
 * Expose jobs for server.js to query on reconnect
 */
router.getJobs = () => jobs;

/**
 * Helper: get io from the request (set by middleware in server.js)
 * Falls back to app.get('io') if req.io is unavailable
 */
function getIO(req) {
  return req.io || (req.app && req.app.get('io'));
}

/**
 * Emit progress to all connected clients with full job metadata
 */
function emitProgress(io, jobId, job) {
  if (!io) return;
  io.emit('progress', {
    jobId,
    status: job.status,
    progress: job.progress,
    title: job.title || null,
    thumbnail: job.thumbnail || null,
    error: job.error || null,
  });
}

/**
 * Process a download job - runs the actual yt-dlp download
 * Designed to run independently without depending on req lifecycle
 */
async function processDownload(io, jobId, url, quality) {
  const job = jobs.get(jobId);
  if (!job) return;

  activeDownloads++;
  console.log(`⬇️  Starting download [${jobId.slice(0, 8)}] (active: ${activeDownloads})`);

  try {
    // Update status to downloading
    job.status = 'downloading';
    job.progress = 0;
    emitProgress(io, jobId, job);

    // Fetch metadata first (title, thumbnail)
    try {
      const info = await getVideoInfo(url);
      job.title = info.title;
      job.thumbnail = info.thumbnail;
      emitProgress(io, jobId, job);
    } catch (infoErr) {
      console.warn(`Could not fetch info for ${url}:`, infoErr.message);
      // Continue anyway — yt-dlp can still download without pre-fetched info
    }

    // Start the actual download+conversion
    const { promise, cancel } = downloadAudio(url, String(quality), jobId, (status, progress) => {
      const j = jobs.get(jobId);
      if (!j || j.status === 'failed') return; // Job was cancelled

      j.status = status;
      j.progress = progress;
      emitProgress(io, jobId, j);
    });
    job.cancel = cancel;

    const filePath = await promise;

    // Download complete
    job.status = 'done';
    job.progress = 100;
    job.filePath = filePath;
    delete job.cancel;
    emitProgress(io, jobId, job);
    console.log(`✅ Completed [${jobId.slice(0, 8)}]: ${job.title || 'Unknown'}`);

  } catch (err) {
    const j = jobs.get(jobId);
    if (j) {
      // Don't overwrite 'failed' (cancelled) with 'error'
      if (j.status !== 'failed') {
        j.status = 'error';
        j.error = err.message;
      }
      delete j.cancel;
      emitProgress(io, jobId, j);
      console.error(`❌ Failed [${jobId.slice(0, 8)}]:`, err.message);
    }
  } finally {
    activeDownloads--;
  }
}

/**
 * GET /api/info?url=...
 * Fetch metadata for a video or playlist
 */
router.get('/info', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    // Detect if playlist
    const isPlaylist =
      url.includes('list=') && !url.includes('watch?v=');

    if (isPlaylist) {
      const items = await getPlaylistInfo(url);
      return res.json({ type: 'playlist', items, count: items.length });
    } else {
      const info = await getVideoInfo(url);
      return res.json({ type: 'video', ...info });
    }
  } catch (err) {
    console.error('Info error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch info' });
  }
});

/**
 * POST /api/download
 * Start a download job — unlimited, no queue limits
 * Body: { url, quality }
 */
router.post('/download', async (req, res) => {
  const { url, quality = '192' } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });
  if (!['128', '192', '320'].includes(String(quality))) {
    return res.status(400).json({ error: 'Invalid quality. Use 128, 192, or 320' });
  }

  // Prevent duplicate active downloads of the same URL+quality
  for (const [id, job] of jobs.entries()) {
    if (
      job.url === url &&
      job.quality === String(quality) &&
      !['done', 'failed', 'error'].includes(job.status)
    ) {
      return res.json({ jobId: id, existing: true });
    }
  }

  const jobId = uuidv4();
  const job = {
    url,
    quality: String(quality),
    status: 'queued',
    progress: 0,
    error: null,
    filePath: null,
    title: null,
    thumbnail: null,
    createdAt: Date.now(),
  };
  jobs.set(jobId, job);

  // Respond immediately with the jobId
  res.json({ jobId });

  // Get the io instance and start the download asynchronously
  const io = getIO(req);

  // Emit initial queued status
  emitProgress(io, jobId, job);

  // Start the download immediately (no p-limit, truly unlimited)
  processDownload(io, jobId, url, quality).catch((err) => {
    console.error('Unexpected processDownload error:', err);
  });
});

/**
 * DELETE /api/download/:jobId
 * Cancel an active download
 */
router.delete('/download/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.cancel) {
    job.cancel();
    delete job.cancel;
  }

  job.status = 'failed';
  job.error = 'Cancelled by user';

  const io = getIO(req);
  emitProgress(io, req.params.jobId, job);

  res.json({ success: true });
});

/**
 * POST /api/retry/:jobId
 * Retry a failed download
 */
router.post('/retry/:jobId', (req, res) => {
  const oldJob = jobs.get(req.params.jobId);
  if (!oldJob) return res.status(404).json({ error: 'Job not found' });

  const newJobId = uuidv4();
  const newJob = {
    url: oldJob.url,
    quality: oldJob.quality || '192',
    status: 'queued',
    progress: 0,
    error: null,
    filePath: null,
    title: oldJob.title,
    thumbnail: oldJob.thumbnail,
    createdAt: Date.now(),
  };
  jobs.set(newJobId, newJob);

  // Clean up old job
  jobs.delete(req.params.jobId);

  res.json({ jobId: newJobId, oldJobId: req.params.jobId });

  const io = getIO(req);
  emitProgress(io, newJobId, newJob);

  processDownload(io, newJobId, newJob.url, newJob.quality).catch((err) => {
    console.error('Unexpected retry error:', err);
  });
});

/**
 * GET /api/progress/:jobId
 * Get download progress
 */
router.get('/progress/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    status: job.status,
    progress: job.progress,
    title: job.title,
    thumbnail: job.thumbnail,
    error: job.error,
  });
});

/**
 * GET /api/file/:jobId
 * Download the completed file
 */
router.get('/file/:jobId', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (job.status !== 'done') return res.status(400).json({ error: 'File not ready' });
  if (!job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ error: 'File not found on server' });
  }

  const filename = `${(job.title || 'audio').replace(/[^\w\s-]/g, '').trim()}.mp3`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'audio/mpeg');

  // Set content length for proper download progress in browser
  try {
    const stat = fs.statSync(job.filePath);
    res.setHeader('Content-Length', stat.size);
  } catch {}

  const stream = fs.createReadStream(job.filePath);
  stream.pipe(res);
  stream.on('error', (err) => {
    console.error('File stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'File read error' });
    }
  });
});

/**
 * POST /api/playlist-download
 * Download entire playlist as individual jobs
 * Body: { urls: string[], quality }
 */
router.post('/playlist-download', async (req, res) => {
  const { urls, quality = '192' } = req.body;
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({ error: 'URLs array is required' });
  }

  const io = getIO(req);
  const jobIds = [];

  // Create individual jobs for each URL in the playlist
  for (const url of urls) {
    // Skip duplicates
    let duplicate = false;
    for (const [id, job] of jobs.entries()) {
      if (
        job.url === url &&
        job.quality === String(quality) &&
        !['done', 'failed', 'error'].includes(job.status)
      ) {
        jobIds.push(id);
        duplicate = true;
        break;
      }
    }
    if (duplicate) continue;

    const jobId = uuidv4();
    const job = {
      url,
      quality: String(quality),
      status: 'queued',
      progress: 0,
      error: null,
      filePath: null,
      title: null,
      thumbnail: null,
      createdAt: Date.now(),
    };
    jobs.set(jobId, job);
    jobIds.push(jobId);

    // Start each download immediately (unlimited concurrency)
    processDownload(io, jobId, url, quality).catch((err) => {
      console.error('Playlist download error:', err);
    });
  }

  res.json({ jobIds, count: jobIds.length });
});

/**
 * GET /api/search?q=...&limit=10
 */
router.get('/search', async (req, res) => {
  const { q, limit = '10' } = req.query;
  if (!q) return res.status(400).json({ error: 'Query is required' });

  try {
    const results = await searchYouTube(q, Math.min(parseInt(limit), 20));
    res.json({ results });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message || 'Search failed' });
  }
});

/**
 * GET /api/stream-url?url=...
 * Returns the direct audio stream URL for a YouTube video (for browser playback)
 */
router.get('/stream-url', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const { getStreamUrl } = require('../utils/ytdlp');
    const streamUrl = await getStreamUrl(url);
    res.json({ streamUrl });
  } catch (err) {
    console.error('Stream URL error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to get stream URL' });
  }
});

/**
 * GET /api/stream?url=...
 * Proxy-streams the audio directly so CORS / auth headers are not an issue
 */
router.get('/stream', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const http = require('http');
    const https = require('https');
    const { getStreamUrl } = require('../utils/ytdlp');

    const streamUrl = await getStreamUrl(url);

    // Fetch and proxy
    const protocol = streamUrl.startsWith('https') ? https : http;
    const proxyReq = protocol.get(streamUrl, (proxyRes) => {
      res.setHeader('Content-Type', proxyRes.headers['content-type'] || 'audio/webm');
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      if (proxyRes.headers['accept-ranges']) {
        res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.statusCode = proxyRes.statusCode || 200;
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (err) => {
      if (!res.headersSent) res.status(502).json({ error: 'Stream proxy error' });
    });
    req.on('close', () => proxyReq.destroy());
  } catch (err) {
    console.error('Stream error:', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message || 'Failed to stream audio' });
  }
});

/**
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeDownloads,
    totalJobs: jobs.size,
  });
});

/**
 * Periodic cleanup of stale jobs from memory (older than 2 hours)
 */
setInterval(() => {
  const now = Date.now();
  const threshold = 2 * 60 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (['done', 'failed', 'error'].includes(job.status) && job.createdAt && now - job.createdAt > threshold) {
      jobs.delete(id);
    }
  }
}, 30 * 60 * 1000);

module.exports = router;
