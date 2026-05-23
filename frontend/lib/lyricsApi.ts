import type { LyricLine, LyricsData } from './store';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Remove clutter from YouTube video titles before using as search query */
export function cleanTitle(raw: string): string {
  return raw
    .replace(/\((?:official\s*(?:video|audio|music\s*video|lyric\s*video|visualizer)|lyrics?|hd|4k|animated)\)/gi, '')
    .replace(/\[(?:official\s*(?:video|audio)|lyrics?|hd|4k)\]/gi, '')
    .replace(/(?:feat\.?|ft\.?)\s+[^,\-\|()\[\]]+/gi, '')
    .replace(/[-–|]\s*(?:official|lyrics?|audio|video|hd|mv).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCacheKey(title: string, artist: string): string {
  return `${cleanTitle(title).toLowerCase()}::${artist.toLowerCase()}`.slice(0, 120);
}

/** Safe fetch with manual timeout (AbortSignal.timeout not available in older Chromium/Electron) */
async function fetchWithTimeout(url: string, ms = 7000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// ─── LRC parser ───────────────────────────────────────────────────────────────

export function parseLRC(lrc: string): LyricLine[] {
  const result: LyricLine[] = [];
  // Each line may have one or more [mm:ss.xx] timestamps
  const lineRe = /^\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/;

  for (const rawLine of lrc.split('\n')) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith('[ti:') || trimmed.startsWith('[ar:') ||
        trimmed.startsWith('[al:') || trimmed.startsWith('[by:') || trimmed.startsWith('[offset:')) {
      continue; // skip metadata tags
    }

    const m = lineRe.exec(trimmed);
    if (!m) continue;

    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    const ms  = m[3] ? parseInt(m[3].padEnd(3, '0').slice(0, 3), 10) : 0;
    const time = min * 60 + sec + ms / 1000;
    const text = m[4].trim();

    if (text) result.push({ time, text });
  }

  return result.sort((a, b) => a.time - b.time);
}

// ─── LRCLIB — try exact match first, then search ─────────────────────────────

async function fromLRCLIB(title: string, artist: string, duration?: number): Promise<LyricsData | null> {
  const cleanedTitle = cleanTitle(title);

  // 1️⃣ Exact-match endpoint (best quality)
  try {
    const params = new URLSearchParams({
      track_name: cleanedTitle,
      artist_name: artist || '',
      ...(duration ? { duration: String(Math.round(duration)) } : {}),
    });
    const res = await fetchWithTimeout(`https://lrclib.net/api/get?${params}`);
    if (res.ok) {
      const item = await res.json();
      if (item && (item.syncedLyrics || item.plainLyrics)) {
        return {
          synced: item.syncedLyrics ? parseLRC(item.syncedLyrics) : null,
          plain:  item.plainLyrics  ?? null,
          source: 'lrclib',
          cachedAt: Date.now(),
        };
      }
    }
  } catch { /* continue to search fallback */ }

  // 2️⃣ Search fallback
  try {
    const q = encodeURIComponent(`${cleanedTitle} ${artist}`.trim());
    const res = await fetchWithTimeout(`https://lrclib.net/api/search?q=${q}`);
    if (!res.ok) return null;
    const results: any[] = await res.json();
    if (!results.length) return null;

    // Prefer results with synced lyrics
    const withSynced = results.find((r) => r.syncedLyrics);
    const best = withSynced ?? results[0];

    return {
      synced: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
      plain:  best.plainLyrics  ?? null,
      source: 'lrclib',
      cachedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Lyrics.ovh fallback ─────────────────────────────────────────────────────

async function fromLyricsOvh(title: string, artist: string): Promise<LyricsData | null> {
  try {
    // lyrics.ovh requires a real artist name — skip if it looks like a channel handle
    if (!artist || artist.toLowerCase().includes('topic') || artist.includes(' - ')) {
      return null;
    }
    const a = encodeURIComponent(artist);
    const t = encodeURIComponent(cleanTitle(title));
    const res = await fetchWithTimeout(`https://api.lyrics.ovh/v1/${a}/${t}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lyrics?.trim()) return null;
    return {
      synced: null,
      plain:  data.lyrics as string,
      source: 'lyrics.ovh',
      cachedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchLyrics(
  title: string,
  artist: string,
  duration?: number,
): Promise<LyricsData> {
  const [lrclib, ovh] = await Promise.allSettled([
    fromLRCLIB(title, artist, duration),
    // Start OVH in parallel (it's only used as fallback)
    fromLyricsOvh(title, artist),
  ]);

  const lrclibResult = lrclib.status === 'fulfilled' ? lrclib.value : null;
  if (lrclibResult) return lrclibResult;

  const ovhResult = ovh.status === 'fulfilled' ? ovh.value : null;
  if (ovhResult) return ovhResult;

  return { synced: null, plain: null, source: 'none', cachedAt: Date.now() };
}

// ─── Active line finder ───────────────────────────────────────────────────────

/**
 * Returns the index of the lyric line that should be highlighted at currentSec.
 * Returns -1 if the song hasn't reached the first line yet.
 */
export function findActiveLine(lines: LyricLine[], currentSec: number): number {
  if (!lines.length) return -1;
  // Before the first line starts
  if (currentSec < lines[0].time) return -1;

  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentSec) idx = i;
    else break;
  }
  return idx;
}
