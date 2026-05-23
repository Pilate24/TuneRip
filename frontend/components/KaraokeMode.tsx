'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { findActiveLine } from '@/lib/lyricsApi';
import type { LyricLine } from '@/lib/store';
import { X, Mic, AlignCenter, Music2 } from 'lucide-react';

interface KaraokeModeProps {
  currentTime: number;
}

export default function KaraokeMode({ currentTime }: KaraokeModeProps) {
  const {
    currentTrack,
    isPlaying,
    currentLyrics,
    lyricsOffset,
    isKaraokeMode,
    isSingAlongMode,
    toggleKaraoke,
    toggleSingAlong,
  } = useStore();

  const [prevIdx, setPrevIdx] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // ESC key handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleKaraoke();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleKaraoke]);

  const lines: LyricLine[] = useMemo(
    () => currentLyrics?.synced ?? [],
    [currentLyrics]
  );

  const adjustedTime = currentTime + lyricsOffset / 1000;
  const activeIdx = useMemo(() => findActiveLine(lines, adjustedTime), [lines, adjustedTime]);

  // track prev idx for animation direction
  useEffect(() => {
    if (activeIdx !== prevIdx) setPrevIdx(activeIdx);
  }, [activeIdx, prevIdx]);

  const currentLine = lines[activeIdx]?.text ?? '';
  const prevLine = lines[activeIdx - 1]?.text ?? '';
  const nextLine = lines[activeIdx + 1]?.text ?? '';

  // Duration-based progress bar
  const nextLineTime = lines[activeIdx + 1]?.time ?? (adjustedTime + 5);
  const lineStart = lines[activeIdx]?.time ?? adjustedTime;
  const lineProgress = Math.min(1, Math.max(0, (adjustedTime - lineStart) / (nextLineTime - lineStart)));

  if (!isKaraokeMode || !currentTrack) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="karaoke-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
        ref={containerRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Blurred album art background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {currentTrack.thumbnail ? (
            <Image
              src={currentTrack.thumbnail}
              alt="bg"
              fill
              style={{ objectFit: 'cover', filter: 'blur(40px) brightness(0.25) saturate(1.6)', transform: 'scale(1.1)' }}
              unoptimized
            />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0a0a1a, #1a0033)' }} />
          )}
          {/* Vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%)' }} />
        </div>

        {/* Controls top-right */}
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 10, display: 'flex', gap: 8 }}>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleSingAlong}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: `1px solid ${isSingAlongMode ? '#ec4899' : 'rgba(255,255,255,0.2)'}`, background: isSingAlongMode ? 'rgba(236,72,153,0.2)' : 'rgba(0,0,0,0.4)', color: isSingAlongMode ? '#f472b6' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(10px)' }}
          >
            <AlignCenter size={13} /> {isSingAlongMode ? 'Exit Sing Along' : 'Sing Along'}
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={toggleKaraoke}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.4)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 12, fontWeight: 600, backdropFilter: 'blur(10px)' }}
          >
            <X size={13} /> Exit (ESC)
          </motion.button>
        </div>

        {/* Track info top-left */}
        <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', position: 'relative', border: '2px solid rgba(124,58,237,0.5)', animation: isPlaying ? 'spin-slow 8s linear infinite' : 'none', flexShrink: 0 }}>
            {currentTrack.thumbnail ? (
              <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music2 size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'white', textShadow: '0 1px 8px rgba(0,0,0,0.8)' }}>{currentTrack.title}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>{currentTrack.artist}</p>
          </div>
        </div>

        {/* Mic badge */}
        <div style={{ position: 'absolute', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: 'rgba(124,58,237,0.3)', border: '1px solid rgba(124,58,237,0.4)', backdropFilter: 'blur(10px)' }}>
            <Mic size={12} style={{ color: 'var(--accent-light)' }} />
            <span style={{ fontSize: 11, color: 'var(--accent-light)', fontWeight: 700 }}>
              {isSingAlongMode ? 'SING ALONG' : 'KARAOKE MODE'}
            </span>
          </div>
        </div>

        {/* ── Lyrics display ─── */}
        <div style={{ position: 'relative', zIndex: 5, width: '100%', maxWidth: 900, padding: '0 40px', textAlign: 'center' }}>

          {lines.length === 0 ? (
            <div style={{ opacity: 0.4 }}>
              <Music2 size={48} style={{ color: 'white', margin: '0 auto 16px' }} />
              <p style={{ fontSize: 18, color: 'white', fontWeight: 600 }}>No synced lyrics</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>Open the lyrics panel to add lyrics</p>
            </div>
          ) : isSingAlongMode ? (
            /* ── Sing Along: just one massive line ── */
            <AnimatePresence mode="wait">
              <motion.div
                key={activeIdx}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -30, scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              >
                <p style={{
                  fontSize: 'clamp(28px, 5vw, 56px)',
                  fontWeight: 900,
                  lineHeight: 1.25,
                  background: 'linear-gradient(90deg, #a78bfa, #f472b6, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.6))',
                  letterSpacing: '-0.5px',
                }}>
                  {currentLine || '♪'}
                </p>
                {/* Bouncing dots timing indicator */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -8, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                      style={{ width: 6, height: 6, borderRadius: '50%', background: isPlaying ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          ) : (
            /* ── Karaoke: prev / active / next ── */
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
              {/* Previous line */}
              <AnimatePresence>
                {prevLine && (
                  <motion.p
                    key={`prev-${activeIdx}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 0.35, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 'clamp(14px, 2vw, 22px)', fontWeight: 600, color: 'white', lineHeight: 1.4 }}
                  >
                    {prevLine}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Active line */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`active-${activeIdx}`}
                  initial={{ opacity: 0, scale: 0.85, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 1.08, y: -20 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                >
                  <p style={{
                    fontSize: 'clamp(24px, 4vw, 46px)',
                    fontWeight: 900,
                    lineHeight: 1.3,
                    background: 'linear-gradient(90deg, #a78bfa, #f472b6)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.7))',
                    letterSpacing: '-0.3px',
                  }}>
                    {currentLine || '♪'}
                  </p>
                  {/* Line progress fill */}
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 2, marginTop: 14, overflow: 'hidden' }}>
                    <motion.div
                      animate={{ width: `${lineProgress * 100}%` }}
                      transition={{ duration: 0.25, ease: 'linear' }}
                      style={{ height: '100%', background: 'linear-gradient(90deg, #7c3aed, #ec4899)', borderRadius: 2 }}
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Next line */}
              <AnimatePresence>
                {nextLine && (
                  <motion.p
                    key={`next-${activeIdx}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 0.45, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ fontSize: 'clamp(14px, 2vw, 22px)', fontWeight: 600, color: 'white', lineHeight: 1.4 }}
                  >
                    {nextLine}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Bottom gradient fade */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)', zIndex: 4, pointerEvents: 'none' }} />

        <style>{`@keyframes spin-slow { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </AnimatePresence>
  );
}
