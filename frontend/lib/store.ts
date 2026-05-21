import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
      }),
    }
  )
);
