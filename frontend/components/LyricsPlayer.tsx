'use client';

import {
  useEffect, useRef, useState, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { fetchLyrics, buildCacheKey, findActiveLine } from '@/lib/lyricsApi';
import { parseLRC } from '@/lib/lyricsApi';
import type { LyricLine } from '@/lib/store';
import {
  X, Mic, Tv2, AlignCenter, Edit3, RotateCcw, Clock, Loader2, Music2,
} from 'lucide-react';

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function LyricSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
      {[80, 60, 90, 50, 75, 55, 85].map((w, i) => (
        <div key={i} style={{ height: 14, borderRadius: 7, background: 'rgba(255,255,255,0.07)', width: `${w}%`, margin: '0 auto' }} className="skeleton" />
      ))}
    </div>
  );
}

// ─── Offset slider ────────────────────────────────────────────────────────────

function OffsetControl({ offset, onChange }: { offset: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <Clock size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>Sync offset</span>
      <input
        type="range" min={-5000} max={5000} step={100} value={offset}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: 'var(--accent)', height: 3 }}
      />
      <span style={{ fontSize: 11, color: 'var(--accent-light)', minWidth: 42, textAlign: 'right' }}>
        {offset > 0 ? '+' : ''}{(offset / 1000).toFixed(1)}s
      </span>
      {offset !== 0 && (
        <button onClick={() => onChange(0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}

// ─── Main LyricsPlayer ───────────────────────────────────────────────────────

interface LyricsPlayerProps {
  currentTime: number;   // seconds
  onClose: () => void;
}

type Tab = 'synced' | 'plain' | 'edit';

export default function LyricsPlayer({ currentTime, onClose }: LyricsPlayerProps) {
  const {
    currentTrack,
    currentLyrics,
    lyricsCache,
    lyricsOffset,
    isKaraokeMode,
    isSingAlongMode,
    setCurrentLyrics,
    cacheLyrics,
    setLyricsOffset,
    toggleKaraoke,
    toggleSingAlong,
  } = useStore();

  const [tab, setTab] = useState<Tab>('synced');
  const [loading, setLoading] = useState(false);
  const [editText, setEditText] = useState('');
  const [customLines, setCustomLines] = useState<LyricLine[] | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // ── Fetch lyrics when track changes ─────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack) return;
    const key = buildCacheKey(currentTrack.title, currentTrack.artist);

    // Check cache first
    if (lyricsCache[key]) {
      setCurrentLyrics(lyricsCache[key]);
      setCustomLines(null);
      setEditText('');
      return;
    }

    setLoading(true);
    setCurrentLyrics(null);
    setCustomLines(null);
    setEditText('');

    fetchLyrics(currentTrack.title, currentTrack.artist).then((data) => {
      setCurrentLyrics(data);
      cacheLyrics(key, data);
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]);

  // ── Active line ──────────────────────────────────────────────────────────────

  const adjustedTime = currentTime + lyricsOffset / 1000;

  const lines: LyricLine[] = useMemo(() => {
    if (customLines) return customLines;
    if (currentLyrics?.synced) return currentLyrics.synced;
    return [];
  }, [customLines, currentLyrics]);

  const activeIdx = useMemo(() => findActiveLine(lines, adjustedTime), [lines, adjustedTime]);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIdx]);

  // ── Custom LRC parse ─────────────────────────────────────────────────────────

  const handleApplyEdit = useCallback(() => {
    if (!editText.trim()) { setCustomLines(null); return; }
    const parsed = parseLRC(editText);
    if (parsed.length) {
      setCustomLines(parsed);
      setTab('synced');
    } else {
      // treat as plain text
      setCustomLines(null);
      setCurrentLyrics({ synced: null, plain: editText, source: 'custom', cachedAt: Date.now() });
      setTab('plain');
    }
  }, [editText, setCurrentLyrics]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasSynced = lines.length > 0;
  const hasPlain = !!currentLyrics?.plain;

  return (
    <motion.div
      initial={{ y: '100%', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      style={{
        position: 'fixed',
        bottom: 96, // above the player bar
        left: 0,
        right: 0,
        zIndex: 8000,
        maxHeight: '55vh',
        background: 'rgba(8,8,16,0.96)',
        backdropFilter: 'blur(30px)',
        borderTop: '1px solid rgba(124,58,237,0.25)',
        boxShadow: '0 -12px 60px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Mic size={15} style={{ color: 'var(--accent-light)' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Lyrics</span>
          {currentLyrics?.source && currentLyrics.source !== 'none' && (
            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', color: 'var(--accent-light)' }}>
              {currentLyrics.source}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Karaoke mode */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleKaraoke}
            title="Karaoke Mode"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${isKaraokeMode ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`, background: isKaraokeMode ? 'rgba(124,58,237,0.2)' : 'transparent', color: isKaraokeMode ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            <Tv2 size={12} /> Karaoke
          </motion.button>
          {/* Sing Along mode */}
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleSingAlong}
            title="Sing Along Mode"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: `1px solid ${isSingAlongMode ? '#ec4899' : 'rgba(255,255,255,0.1)'}`, background: isSingAlongMode ? 'rgba(236,72,153,0.15)' : 'transparent', color: isSingAlongMode ? '#ec4899' : 'var(--text-muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}
          >
            <AlignCenter size={12} /> Sing Along
          </motion.button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '6px 16px 0', flexShrink: 0 }}>
        {([
          { id: 'synced', label: 'Synced', show: true },
          { id: 'plain', label: 'Plain', show: true },
          { id: 'edit', label: 'Edit / Paste', show: true },
        ] as const).map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '5px 12px', borderRadius: '8px 8px 0 0', border: 'none', background: tab === id ? 'rgba(124,58,237,0.18)' : 'transparent', color: tab === id ? 'var(--accent-light)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.15s' }}
          >{label}</button>
        ))}
      </div>

      {/* Content */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 0 4px', position: 'relative' }}>
        <AnimatePresence mode="wait">
          {/* ── Loading ── */}
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: 32 }}>
              <Loader2 size={22} style={{ color: 'var(--accent-light)', animation: 'spin 1s linear infinite' }} />
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fetching lyrics…</p>
              <LyricSkeleton />
            </motion.div>
          )}

          {/* ── Synced tab ── */}
          {!loading && tab === 'synced' && (
            <motion.div key="synced" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {hasSynced ? (
                <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {lines.map((line, i) => {
                    const isActive = i === activeIdx;
                    const isNear = Math.abs(i - activeIdx) <= 2;
                    return (
                      <div
                        key={i}
                        ref={isActive ? activeRef : undefined}
                        style={{
                          padding: '7px 10px',
                          borderRadius: 10,
                          textAlign: 'center',
                          fontSize: isActive ? 17 : 14,
                          fontWeight: isActive ? 800 : 500,
                          color: isActive ? 'transparent' : isNear ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)',
                          background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent',
                          backgroundImage: isActive ? 'linear-gradient(90deg, #7c3aed, #ec4899)' : 'none',
                          WebkitBackgroundClip: isActive ? 'text' : 'unset',
                          WebkitTextFillColor: isActive ? 'transparent' : 'unset',
                          backgroundClip: isActive ? 'text' : 'unset',
                          transition: 'all 0.35s ease',
                          transform: isActive ? 'scale(1.03)' : 'scale(1)',
                          cursor: 'pointer',
                          lineHeight: 1.5,
                        }}
                        onClick={() => {
                          // clicking a line seeks to its time (via an exposed callback)
                        }}
                      >
                        {line.text}
                      </div>
                    );
                  })}
                </div>
              ) : !loading && (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <Music2 size={32} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    {currentLyrics?.source === 'none' ? 'No synced lyrics found' : 'No synced lyrics available'}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {hasPlain ? 'Switch to Plain tab for unsynced lyrics' : 'Try the Edit tab to paste your own LRC'}
                  </p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Plain tab ── */}
          {!loading && tab === 'plain' && (
            <motion.div key="plain" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '12px 20px' }}>
              {hasPlain ? (
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.9, color: 'var(--text-secondary)', fontFamily: 'inherit' }}>
                  {currentLyrics.plain}
                </pre>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>No plain lyrics available</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Edit tab ── */}
          {!loading && tab === 'edit' && (
            <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Paste LRC synced lyrics <code style={{ color: 'var(--accent-light)' }}>[mm:ss.xx] line</code> or plain text. Click Apply to use.
              </p>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                placeholder={'[00:15.00] First lyric line\n[00:18.50] Second line...'}
                style={{ width: '100%', minHeight: 120, background: 'var(--bg-glass)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace', padding: '10px 12px', resize: 'vertical', outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={handleApplyEdit}
                  style={{ padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--gradient-1)', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                >Apply</motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditText(''); setCustomLines(null); }}
                  style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}
                >Clear</motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Offset control */}
      <OffsetControl offset={lyricsOffset} onChange={setLyricsOffset} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
