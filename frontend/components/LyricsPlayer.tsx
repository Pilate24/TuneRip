'use client';

import {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { fetchLyrics, buildCacheKey, findActiveLine, parseLRC } from '@/lib/lyricsApi';
import type { LyricLine } from '@/lib/store';
import {
  X, Mic, Tv2, AlignCenter, RotateCcw, Clock, Loader2, Music2,
} from 'lucide-react';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function LyricSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '24px 20px' }}>
      {[65, 82, 54, 90, 70, 60, 78].map((w, i) => (
        <div
          key={i}
          style={{
            height: 13, borderRadius: 7,
            background: 'rgba(255,255,255,0.07)',
            width: `${w}%`, margin: '0 auto',
            animation: `pulse 1.5s ease-in-out ${i * 0.1}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Offset bar ───────────────────────────────────────────────────────────────

function OffsetControl({ offset, onChange }: { offset: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px 10px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
      <Clock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>Sync</span>
      <input
        type="range" min={-5000} max={5000} step={50} value={offset}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
      <span style={{ fontSize: 11, color: 'var(--accent-light)', minWidth: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {offset > 0 ? '+' : ''}{(offset / 1000).toFixed(1)}s
      </span>
      {offset !== 0 && (
        <button
          onClick={() => onChange(0)}
          title="Reset offset"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, lineHeight: 1 }}
        >
          <RotateCcw size={11} />
        </button>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface LyricsPlayerProps {
  currentTime: number; // seconds from audio element
  onClose: () => void;
}

type Tab = 'synced' | 'plain' | 'edit';

export default function LyricsPlayer({ currentTime, onClose }: LyricsPlayerProps) {
  const {
    currentTrack,
    currentLyrics,
    lyricsOffset,
    isKaraokeMode,
    isSingAlongMode,
    setCurrentLyrics,
    cacheLyrics,
    setLyricsOffset,
    toggleKaraoke,
    toggleSingAlong,
  } = useStore();

  // Read cache once via getState to avoid stale closures
  const [tab, setTab] = useState<Tab>('synced');
  const [loading, setLoading] = useState(false);
  const [editText, setEditText] = useState('');
  const [customLines, setCustomLines] = useState<LyricLine[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollRef  = useRef<HTMLDivElement>(null);
  const lineRefs   = useRef<(HTMLDivElement | null)[]>([]);
  const prevIdxRef = useRef<number>(-1);

  // ── Fetch when track changes ─────────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack) return;

    const key = buildCacheKey(currentTrack.title, currentTrack.artist);

    // Read cache directly from store state (avoids stale closure)
    const cached = useStore.getState().lyricsCache[key];
    if (cached) {
      setCurrentLyrics(cached);
      setCustomLines(null);
      setEditText('');
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentLyrics(null);
    setCustomLines(null);
    setEditText('');

    fetchLyrics(currentTrack.title, currentTrack.artist, currentTrack.duration)
      .then((data) => {
        setCurrentLyrics(data);
        cacheLyrics(key, data);
        if (data.source === 'none') {
          setError('No lyrics found for this track.');
        }
      })
      .catch(() => {
        setError('Failed to fetch lyrics. Check your internet connection.');
      })
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // ── Computed ─────────────────────────────────────────────────────────────────

  const adjustedTime = currentTime + lyricsOffset / 1000;

  const lines: LyricLine[] = useMemo(() => {
    if (customLines) return customLines;
    return currentLyrics?.synced ?? [];
  }, [customLines, currentLyrics]);

  const activeIdx = useMemo(
    () => findActiveLine(lines, adjustedTime),
    [lines, adjustedTime],
  );

  // ── Auto-scroll to active line ────────────────────────────────────────────────

  useEffect(() => {
    if (activeIdx < 0 || activeIdx === prevIdxRef.current) return;
    prevIdxRef.current = activeIdx;
    const el = lineRefs.current[activeIdx];
    if (el && scrollRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx]);

  // Reset line refs when lines change
  useEffect(() => {
    lineRefs.current = lineRefs.current.slice(0, lines.length);
    prevIdxRef.current = -1;
  }, [lines]);

  // ── Custom LRC ───────────────────────────────────────────────────────────────

  const handleApplyEdit = useCallback(() => {
    const txt = editText.trim();
    if (!txt) { setCustomLines(null); return; }
    const parsed = parseLRC(txt);
    if (parsed.length) {
      setCustomLines(parsed);
      setTab('synced');
    } else {
      setCustomLines(null);
      setCurrentLyrics({ synced: null, plain: txt, source: 'custom', cachedAt: Date.now() });
      setTab('plain');
    }
  }, [editText, setCurrentLyrics]);

  // ── Derived flags ────────────────────────────────────────────────────────────

  const hasSynced = lines.length > 0;
  const hasPlain  = !!currentLyrics?.plain;
  const showEmpty = !loading && !hasSynced && tab === 'synced';

  return (
    <motion.div
      key="lyrics-panel"
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      style={{
        position: 'fixed',
        bottom: 80, // sits just above the player bar (player bar ≈ 80px)
        left: 0,
        right: 0,
        zIndex: 8000,
        height: 'min(56vh, 460px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(6,6,14,0.97)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        borderTop: '1px solid rgba(124,58,237,0.3)',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.55)',
      }}
    >

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px 10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <Mic size={14} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Lyrics</span>
          {currentTrack && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
              — {currentTrack.title}
            </span>
          )}
          {currentLyrics?.source && currentLyrics.source !== 'none' && !loading && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: 'var(--accent-light)', flexShrink: 0 }}>
              {currentLyrics.source}
            </span>
          )}
          {hasSynced && !loading && (
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', flexShrink: 0 }}>
              synced
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={toggleKaraoke}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: `1px solid ${isKaraokeMode ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, background: isKaraokeMode ? 'rgba(124,58,237,0.2)' : 'transparent', color: isKaraokeMode ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          ><Tv2 size={11} /> Karaoke</motion.button>

          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.93 }}
            onClick={toggleSingAlong}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8, border: `1px solid ${isSingAlongMode ? '#ec4899' : 'rgba(255,255,255,0.1)'}`, background: isSingAlongMode ? 'rgba(236,72,153,0.15)' : 'transparent', color: isSingAlongMode ? '#ec4899' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          ><AlignCenter size={11} /> Sing Along</motion.button>

          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px 6px', borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 14px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', flexShrink: 0 }}>
        {(['synced', 'plain', 'edit'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '5px 13px', borderRadius: '8px 8px 0 0', border: 'none', background: tab === t ? 'rgba(124,58,237,0.18)' : 'transparent', color: tab === t ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s', textTransform: 'capitalize' }}
          >
            {t === 'synced' ? `Synced${hasSynced ? ` (${lines.length})` : ''}` : t === 'plain' ? 'Plain' : 'Edit / Paste'}
          </button>
        ))}
      </div>

      {/* ── Content area ── */}
      <div
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', scrollBehavior: 'smooth' }}
      >
        {/* Loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '28px 20px' }}>
            <Loader2 size={20} style={{ color: 'var(--accent-light)', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fetching lyrics…</p>
            <LyricSkeleton />
          </div>
        )}

        {/* ── SYNCED ── */}
        {!loading && tab === 'synced' && (
          <>
            {hasSynced ? (
              <div style={{ padding: '12px 10px 40px', display: 'flex', flexDirection: 'column', gap: 1 }}>
                {lines.map((line, i) => {
                  const isActive = i === activeIdx;
                  const dist = Math.abs(i - (activeIdx < 0 ? 0 : activeIdx));
                  const opacity = isActive ? 1 : dist === 1 ? 0.55 : dist === 2 ? 0.35 : 0.2;

                  return (
                    <div
                      key={i}
                      ref={(el) => { lineRefs.current[i] = el; }}
                      onClick={() => {
                        // Seek audio to this line's time
                        setLyricsOffset(0);
                      }}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 12,
                        textAlign: 'center',
                        fontSize: isActive ? 18 : 14,
                        fontWeight: isActive ? 800 : 500,
                        lineHeight: 1.5,
                        cursor: 'default',
                        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                        opacity,
                        transform: isActive ? 'scale(1.04)' : 'scale(1)',
                        background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                        // Gradient text for active line
                        ...(isActive ? {
                          backgroundImage: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                          color: 'transparent',
                        } : {
                          color: 'rgba(255,255,255,0.9)',
                          backgroundImage: 'none',
                          WebkitBackgroundClip: 'unset',
                          WebkitTextFillColor: 'unset',
                          backgroundClip: 'unset',
                        }),
                      }}
                    >
                      {line.text}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <Music2 size={34} style={{ color: 'var(--text-muted)', marginBottom: 14, opacity: 0.5 }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                  {error ?? 'No synced lyrics found'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  {hasPlain
                    ? 'Switch to the Plain tab to read the lyrics'
                    : 'Paste LRC-format lyrics in the Edit tab to sync manually'}
                </p>
              </div>
            )}
          </>
        )}

        {/* ── PLAIN ── */}
        {!loading && tab === 'plain' && (
          <>
            {hasPlain ? (
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 2, color: 'rgba(255,255,255,0.7)', fontFamily: 'inherit', padding: '16px 22px 40px', margin: 0 }}>
                {currentLyrics!.plain}
              </pre>
            ) : (
              <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No plain lyrics available</p>
              </div>
            )}
          </>
        )}

        {/* ── EDIT ── */}
        {!loading && tab === 'edit' && (
          <div style={{ padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
              Paste <strong style={{ color: 'var(--accent-light)' }}>LRC</strong> synced lyrics{' '}
              <code style={{ color: 'var(--accent-light)', fontSize: 10 }}>[mm:ss.xx] line text</code>{' '}
              or plain text. Click <strong>Apply</strong> to use.
            </p>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              spellCheck={false}
              placeholder={'[00:12.50] First lyric line\n[00:16.00] Second lyric line\n[00:20.30] Third line...'}
              style={{ width: '100%', minHeight: 130, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace', padding: '10px 12px', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleApplyEdit}
                style={{ padding: '8px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #ec4899)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >Apply</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditText(''); setCustomLines(null); }}
                style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
              >Clear</motion.button>
            </div>
          </div>
        )}
      </div>

      {/* ── Offset bar ── */}
      <OffsetControl offset={lyricsOffset} onChange={setLyricsOffset} />

      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
      `}</style>
    </motion.div>
  );
}
