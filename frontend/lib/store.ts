import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Background Customization ─────────────────────────────────────────────────

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'video' | 'animated';

export type AnimatedPreset = 'aurora' | 'mesh' | 'particles' | 'waves';

export interface BackgroundConfig {
  type: BackgroundType;
  // solid
  solidColor?: string;
  // gradient
  gradientColors?: string[];
  gradientAngle?: number;
  gradientAnimated?: boolean;
  // image / video (data: URL or preset /path)
  src?: string;
  // animated preset name
  preset?: AnimatedPreset;
  // overlays
  blur?: number;         // px 0–20
  brightness?: number;  // % 50–100
  dimOpacity?: number;  // 0–1
  animationsEnabled?: boolean;
}

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: 'gradient',
  gradientColors: ['#0a0a0f', '#1a0033', '#000d1a'],
  gradientAngle: 135,
  gradientAnimated: true,
  blur: 0,
  brightness: 100,
  dimOpacity: 0,
  animationsEnabled: true,
};

// ─── Lyrics ───────────────────────────────────────────────────────────────────

export interface LyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsData {
  synced: LyricLine[] | null;
  plain: string | null;
  source: string;
  cachedAt: number;
}

// ─── Smart Playlists ──────────────────────────────────────────────────────────

export type MoodType =
  | 'chill' | 'workout' | 'focus' | 'party'
  | 'gaming' | 'sleep' | 'romantic' | 'travel';

export interface SmartPlaylist {
  id: string;
  name: string;
  description: string;
  mood: MoodType;
  tracks: PlayerTrack[];
  createdAt: string;
  coverColor: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: number;
  quality: string;
  url: string;
  downloadedAt: string;
  type: 'video' | 'playlist';
  /** Backend jobId used to stream the file via /api/file/:jobId */
  jobId?: string;
}

export interface DownloadJob {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  quality: string;
  status: 'queued' | 'downloading' | 'converting' | 'done' | 'failed' | 'error';
  progress: number;
  jobId?: string;
  error?: string;
  /** Whether the file has been auto-downloaded to user's device */
  autoDownloaded?: boolean;
  /** Whether this job has been moved to history */
  movedToHistory?: boolean;
}

// ─── Music Player ────────────────────────────────────────────────────────────

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  /** Streamable audio URL (e.g. /api/file/:jobId) */
  src: string;
  duration?: number;
}

export type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  /** Currently loaded track */
  currentTrack: PlayerTrack | null;
  /** Full queue for sequential playback */
  queue: PlayerTrack[];
  /** Index of currentTrack within queue */
  queueIndex: number;
  isPlaying: boolean;
  volume: number;          // 0-1
  isMuted: boolean;
  repeat: RepeatMode;
  isShuffle: boolean;
  isMini: boolean;
  isVisible: boolean;

  // Actions
  setTrack: (track: PlayerTrack, queue?: PlayerTrack[], index?: number) => void;
  setQueue: (tracks: PlayerTrack[], startIndex?: number) => void;
  playTrack: (track: PlayerTrack) => void;
  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setRepeat: (mode: RepeatMode) => void;
  toggleShuffle: () => void;
  toggleMini: () => void;
  setVisible: (v: boolean) => void;
  nextTrack: () => void;
  prevTrack: () => void;
}

// ─── Download Queue ──────────────────────────────────────────────────────────

interface StoreState extends PlayerState {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  history: HistoryEntry[];
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  removeHistory: (id: string) => void;
  downloadQueue: DownloadJob[];
  addToQueue: (job: DownloadJob) => void;
  updateQueue: (id: string, updates: Partial<DownloadJob>) => void;
  updateQueueByJobId: (jobId: string, updates: Partial<DownloadJob>) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  clearCompletedFromQueue: () => void;
  defaultQuality: string;
  setDefaultQuality: (q: string) => void;
  // Background
  backgroundConfig: BackgroundConfig;
  setBackground: (config: Partial<BackgroundConfig>) => void;
  resetBackground: () => void;
  // Lyrics
  lyricsCache: Record<string, LyricsData>;
  currentLyrics: LyricsData | null;
  lyricsOffset: number; // ms adjustment
  showLyrics: boolean;
  isKaraokeMode: boolean;
  isSingAlongMode: boolean;
  setCurrentLyrics: (lyrics: LyricsData | null) => void;
  cacheLyrics: (key: string, data: LyricsData) => void;
  setLyricsOffset: (ms: number) => void;
  toggleLyrics: () => void;
  toggleKaraoke: () => void;
  toggleSingAlong: () => void;
  // Smart Playlists
  smartPlaylists: SmartPlaylist[];
  addSmartPlaylist: (playlist: SmartPlaylist) => void;
  removeSmartPlaylist: (id: string) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      // ── Theme ────────────────────────────────────────────────────────────
      theme: 'dark',
      toggleTheme: () =>
        set((s) => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // ── History ──────────────────────────────────────────────────────────
      history: [],
      addHistory: (entry) =>
        set((s) => {
          // Prevent duplicate entries (by URL or id)
          const exists = s.history.some((h) => h.url === entry.url || h.id === entry.id);
          if (exists) return s;
          return { history: [entry, ...s.history].slice(0, 500) };
        }),
      clearHistory: () => set({ history: [] }),
      removeHistory: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),

      // ── Download Queue ────────────────────────────────────────────────────
      downloadQueue: [],
      addToQueue: (job) =>
        set((s) => {
          // Prevent duplicate queue entries by jobId
          if (job.jobId && s.downloadQueue.some((j) => j.jobId === job.jobId)) {
            return s;
          }
          return { downloadQueue: [...s.downloadQueue, job] };
        }),
      updateQueue: (id, updates) =>
        set((s) => ({
          downloadQueue: s.downloadQueue.map((j) =>
            j.id === id ? { ...j, ...updates } : j
          ),
        })),
      updateQueueByJobId: (jobId, updates) =>
        set((s) => ({
          downloadQueue: s.downloadQueue.map((j) =>
            j.jobId === jobId ? { ...j, ...updates } : j
          ),
        })),
      removeFromQueue: (id) =>
        set((s) => ({
          downloadQueue: s.downloadQueue.filter((j) => j.id !== id),
        })),
      clearQueue: () => set({ downloadQueue: [] }),
      clearCompletedFromQueue: () =>
        set((s) => ({
          downloadQueue: s.downloadQueue.filter(
            (j) => !['done', 'failed', 'error'].includes(j.status)
          ),
        })),

      defaultQuality: '192',
      setDefaultQuality: (q) => set({ defaultQuality: q }),

      // ── Background ───────────────────────────────────────────────────────
      backgroundConfig: DEFAULT_BACKGROUND,
      setBackground: (config) =>
        set((s) => ({ backgroundConfig: { ...s.backgroundConfig, ...config } })),
      resetBackground: () => set({ backgroundConfig: DEFAULT_BACKGROUND }),

      // ── Lyrics ──────────────────────────────────────────────────────────
      lyricsCache: {},
      currentLyrics: null,
      lyricsOffset: 0,
      showLyrics: false,
      isKaraokeMode: false,
      isSingAlongMode: false,
      setCurrentLyrics: (lyrics) => set({ currentLyrics: lyrics }),
      cacheLyrics: (key, data) =>
        set((s) => {
          const entries = Object.entries(s.lyricsCache);
          // Cap cache at 200 songs
          const pruned = entries.length >= 200
            ? Object.fromEntries(entries.slice(-199))
            : s.lyricsCache;
          return { lyricsCache: { ...pruned, [key]: data } };
        }),
      setLyricsOffset: (ms) => set({ lyricsOffset: ms }),
      toggleLyrics: () => set((s) => ({ showLyrics: !s.showLyrics })),
      toggleKaraoke: () => set((s) => ({
        isKaraokeMode: !s.isKaraokeMode,
        isSingAlongMode: false,
        showLyrics: true,
      })),
      toggleSingAlong: () => set((s) => ({
        isSingAlongMode: !s.isSingAlongMode,
        // Entering Sing Along always opens karaoke overlay; exiting leaves karaoke as-is
        isKaraokeMode: !s.isSingAlongMode ? true : s.isKaraokeMode,
        showLyrics: true,
      })),

      // ── Smart Playlists ──────────────────────────────────────────────────
      smartPlaylists: [],
      addSmartPlaylist: (playlist) =>
        set((s) => ({ smartPlaylists: [playlist, ...s.smartPlaylists] })),
      removeSmartPlaylist: (id) =>
        set((s) => ({ smartPlaylists: s.smartPlaylists.filter((p) => p.id !== id) })),

      // ── Music Player ──────────────────────────────────────────────────────
      currentTrack: null,
      queue: [],
      queueIndex: 0,
      isPlaying: false,
      volume: 0.8,
      isMuted: false,
      repeat: 'none',
      isShuffle: false,
      isMini: false,
      isVisible: false,

      setTrack: (track, queue, index = 0) =>
        set({
          currentTrack: track,
          queue: queue ?? [track],
          queueIndex: index,
          isPlaying: true,
          isVisible: true,
          isMini: false,
        }),

      setQueue: (tracks, startIndex = 0) => {
        const track = tracks[startIndex];
        if (!track) return;
        set({
          queue: tracks,
          queueIndex: startIndex,
          currentTrack: track,
          isPlaying: true,
          isVisible: true,
        });
      },

      playTrack: (track) => {
        const { queue, setTrack } = get();
        const idx = queue.findIndex((t) => t.id === track.id);
        if (idx >= 0) {
          set({ queueIndex: idx, currentTrack: track, isPlaying: true, isVisible: true });
        } else {
          setTrack(track);
        }
      },

      setPlaying: (playing) => set({ isPlaying: playing }),
      togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), isMuted: v === 0 }),
      toggleMute: () =>
        set((s) => ({ isMuted: !s.isMuted })),
      setRepeat: (mode) => set({ repeat: mode }),
      toggleShuffle: () => set((s) => ({ isShuffle: !s.isShuffle })),
      toggleMini: () => set((s) => ({ isMini: !s.isMini })),
      setVisible: (v) => set({ isVisible: v }),

      nextTrack: () => {
        const { queue, queueIndex, isShuffle, repeat } = get();
        if (queue.length === 0) return;
        let next: number;
        if (isShuffle) {
          next = Math.floor(Math.random() * queue.length);
        } else {
          next = queueIndex + 1;
          if (next >= queue.length) {
            if (repeat === 'all') next = 0;
            else return; // stop
          }
        }
        set({ queueIndex: next, currentTrack: queue[next], isPlaying: true });
      },

      prevTrack: () => {
        const { queue, queueIndex } = get();
        if (queue.length === 0) return;
        const prev = Math.max(0, queueIndex - 1);
        set({ queueIndex: prev, currentTrack: queue[prev], isPlaying: true });
      },
    }),
    {
      name: 'tunerip-store',
      partialize: (s) => ({
        theme: s.theme,
        history: s.history,
        defaultQuality: s.defaultQuality,
        volume: s.volume,
        repeat: s.repeat,
        isShuffle: s.isShuffle,
        backgroundConfig: s.backgroundConfig,
        lyricsCache: s.lyricsCache,
        lyricsOffset: s.lyricsOffset,
        smartPlaylists: s.smartPlaylists,
      }),
    }
  )
);
