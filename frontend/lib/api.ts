import axios from 'axios';

export let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
});

export interface VideoInfo {
  type: 'video';
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
  url: string;
}

export interface PlaylistInfo {
  type: 'playlist';
  items: PlaylistItem[];
  count: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  url: string;
}

export interface JobStatus {
  status: 'pending' | 'downloading' | 'done' | 'error';
  progress: number;
  title?: string;
  thumbnail?: string;
  error?: string;
}

export interface SearchResult {
  id: string;
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  url: string;
}

export const getInfo = async (url: string): Promise<VideoInfo | PlaylistInfo> => {
  const res = await api.get('/info', { params: { url } });
  return res.data;
};

export const startDownload = async (url: string, quality: string): Promise<{ jobId: string }> => {
  const res = await api.post('/download', { url, quality });
  return res.data;
};

export const getProgress = async (jobId: string): Promise<JobStatus> => {
  const res = await api.get(`/progress/${jobId}`);
  return res.data;
};

export const getFileUrl = (jobId: string): string => {
  return `${API_BASE}/api/file/${jobId}`;
};

export const startPlaylistDownload = async (
  urls: string[],
  quality: string
): Promise<{ jobId: string }> => {
  const res = await api.post('/playlist-download', { urls, quality });
  return res.data;
};

export const searchYouTube = async (q: string, limit = 10): Promise<SearchResult[]> => {
  const res = await api.get('/search', { params: { q, limit } });
  return res.data.results;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatViews = (count: number): string => {
  if (!count) return '0';
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(1)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
};

export const setApiBase = (url: string) => {
  API_BASE = url;
  api.defaults.baseURL = `${url}/api`;
};

/**
 * Get the proxied stream URL for online playback
 * Encodes the YouTube URL and returns the backend /api/stream endpoint
 */
export const getStreamProxyUrl = (youtubeUrl: string): string => {
  return `${API_BASE}/api/stream?url=${encodeURIComponent(youtubeUrl)}`;
};

/**
 * Fetch the direct audio stream URL (non-proxied, for advanced use)
 */
export const fetchStreamUrl = async (youtubeUrl: string): Promise<string> => {
  const res = await api.get('/stream-url', { params: { url: youtubeUrl } });
  return res.data.streamUrl;
};

export default api;
