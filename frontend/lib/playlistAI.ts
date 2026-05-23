import type { HistoryEntry, PlayerTrack, MoodType } from './store';

// ─── Mood config ──────────────────────────────────────────────────────────────

export interface MoodConfig {
  label: string;
  emoji: string;
  description: string;
  gradient: string;
  color: string;
  keywords: string[];
  preferLong: boolean;   // prefers longer tracks (>4 min)
  preferShort: boolean;  // prefers shorter tracks (<3 min)
  energyBias: number;    // 0=calm, 1=energetic — used to weight duration scoring
}

export const MOODS: Record<MoodType, MoodConfig> = {
  chill: {
    label: 'Chill', emoji: '🌙', description: 'Relaxed, laid-back vibes',
    gradient: 'linear-gradient(135deg, #1e3a5f, #0d2137)',
    color: '#38bdf8',
    keywords: ['chill', 'lofi', 'lo-fi', 'relax', 'calm', 'slow', 'ambient', 'sleep', 'acoustic', 'soft', 'mellow', 'study'],
    preferLong: true, preferShort: false, energyBias: 0.1,
  },
  workout: {
    label: 'Workout', emoji: '💪', description: 'High energy, pump it up',
    gradient: 'linear-gradient(135deg, #7f1d1d, #991b1b)',
    color: '#f87171',
    keywords: ['workout', 'gym', 'training', 'energy', 'pump', 'beast', 'fire', 'power', 'intense', 'hard', 'rock', 'metal', 'bass', 'edm', 'electro', 'trap'],
    preferLong: false, preferShort: true, energyBias: 1.0,
  },
  focus: {
    label: 'Focus', emoji: '🧠', description: 'Deep work & concentration',
    gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    color: '#a5b4fc',
    keywords: ['focus', 'study', 'concentration', 'deep', 'work', 'piano', 'classical', 'instrumental', 'ambient', 'lofi', 'lo-fi', 'binaural'],
    preferLong: true, preferShort: false, energyBias: 0.2,
  },
  party: {
    label: 'Party', emoji: '🎉', description: 'Dance floor energy',
    gradient: 'linear-gradient(135deg, #7c3aed, #ec4899)',
    color: '#f0abfc',
    keywords: ['party', 'dance', 'club', 'edm', 'house', 'techno', 'remix', 'dj', 'beat', 'bass', 'drop', 'festival', 'rave', 'banger'],
    preferLong: false, preferShort: true, energyBias: 0.9,
  },
  gaming: {
    label: 'Gaming', emoji: '🎮', description: 'Epic gaming soundtracks',
    gradient: 'linear-gradient(135deg, #064e3b, #065f46)',
    color: '#34d399',
    keywords: ['gaming', 'epic', 'ost', 'soundtrack', 'game', 'cinematic', 'action', 'adventure', 'boss', 'theme', 'battle', 'hero'],
    preferLong: true, preferShort: false, energyBias: 0.7,
  },
  sleep: {
    label: 'Sleep', emoji: '😴', description: 'Peaceful sounds for rest',
    gradient: 'linear-gradient(135deg, #0c1445, #0f172a)',
    color: '#818cf8',
    keywords: ['sleep', 'lullaby', 'calm', 'peaceful', 'night', 'rain', 'nature', 'white noise', 'meditation', 'relaxing', 'soft', 'quiet', 'ambient'],
    preferLong: true, preferShort: false, energyBias: 0.0,
  },
  romantic: {
    label: 'Romantic', emoji: '❤️', description: 'Love & tender moments',
    gradient: 'linear-gradient(135deg, #881337, #4a044e)',
    color: '#fb7185',
    keywords: ['love', 'romantic', 'romance', 'heart', 'soul', 'r&b', 'rnb', 'jazz', 'blues', 'slow', 'ballad', 'tender', 'sweet'],
    preferLong: false, preferShort: false, energyBias: 0.3,
  },
  travel: {
    label: 'Travel', emoji: '✈️', description: 'Road trip & adventure',
    gradient: 'linear-gradient(135deg, #0c4a6e, #075985)',
    color: '#38bdf8',
    keywords: ['travel', 'road', 'trip', 'adventure', 'journey', 'explore', 'world', 'indie', 'folk', 'pop', 'feel good', 'summer', 'vacation', 'beach'],
    preferLong: false, preferShort: false, energyBias: 0.5,
  },
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

export function scoreSongForMood(entry: HistoryEntry, mood: MoodType): number {
  const cfg = MOODS[mood];
  const text = `${entry.title} ${entry.channel}`.toLowerCase();
  let score = 0;

  // Keyword matching (up to 60 pts)
  for (const kw of cfg.keywords) {
    if (text.includes(kw)) {
      score += kw.length > 5 ? 12 : 8; // longer keywords = stronger signal
    }
  }
  score = Math.min(score, 60);

  // Duration scoring (up to 25 pts)
  const dur = entry.duration ?? 0;
  if (dur > 0) {
    if (cfg.preferLong && dur > 240) score += 25;
    else if (cfg.preferLong && dur > 180) score += 15;
    else if (cfg.preferShort && dur < 180) score += 25;
    else if (cfg.preferShort && dur < 240) score += 12;
    else score += 10; // neutral
  }

  // Recency bonus (up to 15 pts) — songs downloaded in last 7 days
  const ageMs = Date.now() - new Date(entry.downloadedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1) score += 15;
  else if (ageDays < 7) score += 10;
  else if (ageDays < 30) score += 5;

  // Penalize playlist entries (less specific metadata)
  if (entry.type === 'playlist') score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ─── Playlist generation ─────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function historyToTrack(entry: HistoryEntry): PlayerTrack {
  return {
    id: entry.id,
    title: entry.title,
    artist: entry.channel,
    thumbnail: entry.thumbnail,
    src: entry.jobId ? `${API_BASE}/api/file/${entry.jobId}` : '',
    duration: entry.duration,
  };
}

export function generatePlaylist(
  history: HistoryEntry[],
  mood: MoodType,
  count = 20
): PlayerTrack[] {
  // Only include playable tracks (have a jobId)
  const playable = history.filter((h) => h.jobId && h.type === 'video');

  if (!playable.length) return [];

  const scored = playable
    .map((entry) => ({ entry, score: scoreSongForMood(entry, mood) }))
    .sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, Math.min(count * 2, scored.length));

  // Intelligent shuffle within selected pool
  const tracks = selected.map((s) => historyToTrack(s.entry));
  return shuffleIntelligent(tracks).slice(0, count);
}

// ─── Intelligent shuffle ──────────────────────────────────────────────────────

export function shuffleIntelligent(tracks: PlayerTrack[]): PlayerTrack[] {
  if (tracks.length <= 1) return tracks;

  // Fisher-Yates first
  const arr = [...tracks];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }

  // Artist spread: avoid same artist consecutively
  const result: PlayerTrack[] = [];
  const remaining = [...arr];

  while (remaining.length) {
    const lastArtist = result[result.length - 1]?.artist ?? '';
    const diffIdx = remaining.findIndex((t) => t.artist !== lastArtist);
    const idx = diffIdx >= 0 ? diffIdx : 0;
    result.push(remaining.splice(idx, 1)[0]);
  }

  return result;
}

// ─── Time-of-day auto mood ────────────────────────────────────────────────────

export function getTimeOfDayMood(): MoodType {
  const h = new Date().getHours();
  if (h >= 22 || h < 6) return 'sleep';
  if (h >= 6 && h < 9) return 'focus';
  if (h >= 9 && h < 12) return 'workout';
  if (h >= 12 && h < 14) return 'chill';
  if (h >= 14 && h < 18) return 'focus';
  if (h >= 18 && h < 20) return 'travel';
  return 'chill';
}

// ─── Discover similar ────────────────────────────────────────────────────────

export function findSimilar(
  seedTrack: PlayerTrack,
  history: HistoryEntry[],
  count = 10
): PlayerTrack[] {
  const seedWords = seedTrack.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const seedArtist = seedTrack.artist.toLowerCase();

  const playable = history.filter(
    (h) => h.jobId && h.id !== seedTrack.id && h.type === 'video'
  );

  const scored = playable.map((entry) => {
    const titleLower = entry.title.toLowerCase();
    const artistLower = entry.channel.toLowerCase();
    let score = 0;
    // Same artist = high weight
    if (artistLower === seedArtist) score += 40;
    else if (artistLower.includes(seedArtist) || seedArtist.includes(artistLower)) score += 20;
    // Shared title words
    for (const w of seedWords) {
      if (titleLower.includes(w)) score += 8;
    }
    // Similar duration (within 30s)
    const durDiff = Math.abs((entry.duration ?? 0) - (seedTrack.duration ?? 0));
    if (durDiff < 30) score += 10;
    return { entry, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((s) => historyToTrack(s.entry));
}
