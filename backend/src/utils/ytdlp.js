const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const ytDlp = require('yt-dlp-exec');
let FFMPEG_PATH = require('ffmpeg-static');

// Fix ffmpeg path in packaged app
if (FFMPEG_PATH && FFMPEG_PATH.includes('app.asar')) {
  FFMPEG_PATH = FFMPEG_PATH.replace('app.asar', 'app.asar.unpacked');
}

const TEMP_DIR = process.env.TEMP_DIR || path.join(os.tmpdir(), 'tunerip-temp');

// Ensure temp dir exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Check if yt-dlp is installed
 */
function checkYtDlp() {
  return true; // yt-dlp-exec manages its own binary
}

/**
 * Fetch video info without downloading
 */
function getVideoInfo(url) {
  return new Promise((resolve, reject) => {
    const proc = ytDlp.exec(url, {
      dumpJson: true,
      noPlaylist: true,
      noWarnings: true
    });
    
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'Failed to fetch video info'));
      try {
        const info = JSON.parse(stdout);
        resolve({
          id: info.id,
          title: info.title,
          thumbnail: info.thumbnail,
          duration: info.duration,
          channel: info.uploader || info.channel,
          viewCount: info.view_count,
          likeCount: info.like_count,
          uploadDate: info.upload_date,
          description: info.description,
          url: info.webpage_url,
        });
      } catch (e) {
        reject(new Error('Failed to parse video info'));
      }
    });

    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

/**
 * Fetch playlist info
 */
function getPlaylistInfo(url) {
  return new Promise((resolve, reject) => {
    const proc = ytDlp.exec(url, {
      dumpJson: true,
      flatPlaylist: true,
      noWarnings: true
    });
    
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'Failed to fetch playlist info'));
      try {
        const lines = stdout.trim().split('\n').filter(Boolean);
        const items = lines.map((line) => {
          const item = JSON.parse(line);
          return {
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            duration: item.duration,
            channel: item.uploader || item.channel,
            url: item.url || `https://www.youtube.com/watch?v=${item.id}`,
          };
        });
        resolve(items);
      } catch (e) {
        reject(new Error('Failed to parse playlist info'));
      }
    });

    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

/**
 * Download a single video as MP3
 * @param {string} url - YouTube URL
 * @param {string} quality - '128' | '192' | '320'
 * @param {string} outputId - unique ID for the file
 * @param {Function} onProgress - callback(status, progress)
 *   status: 'downloading' | 'converting'
 *   progress: 0-100
 * @returns {{ promise: Promise<string>, cancel: () => void }}
 */
function downloadAudio(url, quality = '192', outputId, onProgress) {
  let proc;
  let killed = false;

  const promise = new Promise((resolve, reject) => {
    const outputPath = path.join(TEMP_DIR, `${outputId}.%(ext)s`);
    const finalPath = path.join(TEMP_DIR, `${outputId}.mp3`);

    const procOpts = {
      x: true,
      audioFormat: 'mp3',
      audioQuality: `${quality}K`,
      ffmpegLocation: FFMPEG_PATH,
      noPlaylist: true,
      noWarnings: true,
      newline: true,
      progress: true,
      o: outputPath
    };

    proc = ytDlp.exec(url, procOpts);
    let stderr = '';
    let lastProgress = 0;

    proc.stdout.on('data', (d) => {
      const lines = d.toString().split('\n');
      for (const line of lines) {
        // Parse download progress: [download]  50.5% of ...
        const dlMatch = line.match(/\[download\]\s+([\d.]+)%/);
        if (dlMatch && onProgress) {
          const pct = parseFloat(dlMatch[1]);
          // Scale download to 0-85% of total progress
          lastProgress = Math.min(85, pct * 0.85);
          onProgress('downloading', Math.round(lastProgress));
        }
        // Detect conversion phase
        else if (line.includes('[ExtractAudio]') || line.includes('[ffmpeg]')) {
          if (onProgress) onProgress('converting', 90);
        }
        // Post-processing / merging
        else if (line.includes('[Merger]') || line.includes('Deleting original')) {
          if (onProgress) onProgress('converting', 95);
        }
      }
    });

    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (killed) return reject(new Error('Cancelled by user'));
      if (code !== 0) return reject(new Error(stderr || 'Download failed'));

      // Signal converting done
      if (onProgress) onProgress('converting', 98);

      // Find the output file
      if (fs.existsSync(finalPath)) {
        if (onProgress) onProgress('done', 100);
        resolve(finalPath);
      } else {
        // Try to find the output file with any extension
        try {
          const files = fs.readdirSync(TEMP_DIR).filter((f) => f.startsWith(outputId));
          if (files.length > 0) {
            const found = path.join(TEMP_DIR, files[0]);
            if (onProgress) onProgress('done', 100);
            resolve(found);
          } else {
            reject(new Error('Output file not found after download'));
          }
        } catch (e) {
          reject(new Error('Output file not found after download'));
        }
      }
    });

    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });

  return {
    promise,
    cancel: () => {
      killed = true;
      if (proc) {
        try { proc.kill('SIGTERM'); } catch {}
      }
      // Clean up any partial files
      try {
        const files = fs.readdirSync(TEMP_DIR).filter((f) => f.startsWith(outputId));
        files.forEach((f) => {
          try { fs.unlinkSync(path.join(TEMP_DIR, f)); } catch {}
        });
      } catch {}
    },
  };
}

/**
 * Search YouTube
 */
function searchYouTube(query, limit = 10) {
  return new Promise((resolve, reject) => {
    const proc = ytDlp.exec(`ytsearch${limit}:${query}`, {
      dumpJson: true,
      flatPlaylist: true,
      noWarnings: true
    });
    
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'Search failed'));
      try {
        const lines = stdout.trim().split('\n').filter(Boolean);
        const results = lines.map((line) => {
          const item = JSON.parse(line);
          return {
            id: item.id,
            title: item.title,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.id}/hqdefault.jpg`,
            duration: item.duration,
            channel: item.uploader || item.channel || 'Unknown',
            url: `https://www.youtube.com/watch?v=${item.id}`,
          };
        });
        resolve(results);
      } catch (e) {
        reject(new Error('Failed to parse search results'));
      }
    });

    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

/**
 * Clean up temp files older than 15 minutes
 */
function cleanupTempFiles() {
  const now = Date.now();
  const threshold = 15 * 60 * 1000; // 15 minutes
  try {
    const files = fs.readdirSync(TEMP_DIR);
    let cleaned = 0;
    files.forEach((file) => {
      const filePath = path.join(TEMP_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > threshold) {
          fs.unlinkSync(filePath);
          cleaned++;
        }
      } catch {}
    });
    if (cleaned > 0) console.log(`🧹 Cleaned up ${cleaned} temp file(s)`);
  } catch (e) {
    console.error('Cleanup error:', e.message);
  }
}

/**
 * Get direct audio stream URL for a YouTube video (for online playback)
 * Uses yt-dlp's -g flag to get the URL without downloading
 */
function getStreamUrl(url) {
  return new Promise((resolve, reject) => {
    const proc = ytDlp.exec(url, {
      f: 'bestaudio[ext=m4a]/bestaudio/best',
      g: true,
      noPlaylist: true,
      noWarnings: true,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => (stdout += d.toString()));
    proc.stderr.on('data', (d) => (stderr += d.toString()));

    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(stderr || 'Failed to get stream URL'));
      const streamUrl = stdout.trim().split('\n')[0];
      if (!streamUrl) return reject(new Error('No stream URL returned'));
      resolve(streamUrl);
    });

    proc.on('error', (e) => reject(new Error(`yt-dlp not found: ${e.message}`)));
  });
}

module.exports = {
  checkYtDlp,
  getVideoInfo,
  getPlaylistInfo,
  downloadAudio,
  searchYouTube,
  getStreamUrl,
  cleanupTempFiles,
  TEMP_DIR,
};
