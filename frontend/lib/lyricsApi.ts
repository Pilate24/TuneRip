import type { LyricLine, LyricsData } from './store';

// ─── Title cleaner ────────────────────────────────────────────────────────────

export function cleanTitle(raw: string): string {
  return raw
    .replace(/\((?:official\s*(?:video|audio|music\s*video|lyric\s*video)|lyrics?|hd|4k|visualizer|animated)\)/gi, '')
    .replace(/\[(?:official\s*(?:video|audio)|lyrics?|hd|4k)\]/gi, '')
    .replace(/(?:feat\.?|ft\.?)\s+[^,\-\|]+/gi, '')
    .replace(/[-–|]\s*(?:official|lyrics?|audio|video|hd).*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildCacheKey(title: string, artist: string): string {
  return `${cleanTitle(title).toLowerCase()}::${artist.toLowerCase()}`.slice(0, 120);
}

// ─── LRC parser ───────────────────────────────────────────────────────────────

export function parseLRC(lrc: string): LyricLine[] {
  const lines = lrc.split('\n');
  const result: LyricLine[] = [];
  // Match [mm:ss.xx] or [mm:ss]
  const timeRe = /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g;

  for (const line of lines) {
    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d+)?\]/g, '').trim();
    if (!text) continue;

    timeRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = timeRe.exec(line)) !== null) {
      const min = parseInt(match[1], 10);
      const sec = parseInt(match[2], 10);
      const ms = match[3] ? parseInt(match[3].padEnd(3, '0'), 10) : 0;
      const time = min * 60 + sec + ms / 1000;
      result.push({ time, text });
    }
  }

  return result.sort((a, b) => a.time - b.time);
}

// ─── LRCLIB ──────────────────────────────────────────────────────────────────

async function fromLRCLIB(title: string, artist: string): Promise<LyricsData | null> {
  try {
    const q = encodeURIComponent(`${cleanTitle(title)} ${artist}`);
    const res = await fetch(
      `https://lrclib.net/api/search?q=${q}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const results: any[] = await res.json();
    if (!results.length) return null;

    // Pick best match — prefer ones with syncedLyrics
    const withSynced = results.find((r) => r.syncedLyrics);
    const best = withSynced ?? results[0];

    return {
      synced: best.syncedLyrics ? parseLRC(best.syncedLyrics) : null,
      plain: best.plainLyrics ?? null,
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
    const a = encodeURIComponent(artist || 'unknown');
    const t = encodeURIComponent(cleanTitle(title));
    const res = await fetch(
      `https://api.lyrics.ovh/v1/${a}/${t}`,
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.lyrics) return null;
    return {
      synced: null,
      plain: data.lyrics as string,
      source: 'lyrics.ovh',
      cachedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function fetchLyrics(title: string, artist: string): Promise<LyricsData> {
  const lrclib = await fromLRCLIB(title, artist);
  if (lrclib) return lrclib;

  const ovh = await fromLyricsOvh(title, artist);
  if (ovh) return ovh;

  return { synced: null, plain: null, source: 'none', cachedAt: Date.now() };
}

// ─── Active line finder ───────────────────────────────────────────────────────

export function findActiveLine(lines: LyricLine[], currentSec: number): number {
  if (!lines.length) return -1;
  let idx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].time <= currentSec) idx = i;
    else break;
  }
  return idx;
}
