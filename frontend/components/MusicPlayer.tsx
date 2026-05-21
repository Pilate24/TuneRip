'use client';

import {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Music2,
  ListMusic,
  X,
} from 'lucide-react';
import { useStore, RepeatMode } from '@/lib/store';

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(sec: number): string {
  if (!isFinite(sec) || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─── Waveform Visualiser (CSS-only animated bars) ────────────────────────────

function Waveform({ active }: { active: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        height: 16,
      }}
    >
      {[0.4, 0.7, 1, 0.6, 0.85, 0.5, 0.75].map((h, i) => (
        <div
          key={i}
          style={{
            width: 2,
            borderRadius: 2,
            background: 'var(--accent-light)',
            height: active ? `${h * 100}%` : '30%',
            animation: active ? `waveBar 0.8s ease-in-out ${i * 0.1}s infinite alternate` : 'none',
            transition: 'height 0.4s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Queue Panel ─────────────────────────────────────────────────────────────

function QueuePanel({
  queue,
  queueIndex,
  onSelect,
}: {
  queue: { id: string; title: string; artist: string; thumbnail: string }[];
  queueIndex: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div
      style={{
        maxHeight: 260,
        overflowY: 'auto',
        padding: '8px 0',
      }}
    >
      {queue.map((t, i) => (
        <button
          key={t.id + i}
          onClick={() => onSelect(i)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: '8px 16px',
            background: i === queueIndex ? 'rgba(124,58,237,0.15)' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            textAlign: 'left',
            borderRadius: 8,
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 6,
              overflow: 'hidden',
              flexShrink: 0,
              position: 'relative',
              background: 'var(--bg-secondary)',
            }}
          >
            {t.thumbnail ? (
              <Image src={t.thumbnail} alt={t.title} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <Music2 size={16} style={{ color: 'var(--text-muted)', margin: '9px auto', display: 'block' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: i === queueIndex ? 700 : 500,
                color: i === queueIndex ? 'var(--accent-light)' : 'var(--text-primary)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {t.title}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{t.artist}</p>
          </div>
          {i === queueIndex && <Waveform active />}
        </button>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MusicPlayer() {
  const {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    volume,
    isMuted,
    repeat,
    isShuffle,
    isMini,
    isVisible,
    setPlaying,
    togglePlay,
    setVolume,
    toggleMute,
    setRepeat,
    toggleShuffle,
    toggleMini,
    setVisible,
    nextTrack,
    prevTrack,
    setQueue,
  } = useStore();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const prevSrcRef = useRef<string>('');

  // ── Audio element wiring ────────────────────────────────────────────────────

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'metadata';
    }
    const audio = audioRef.current;

    const onTime = () => { if (!isSeeking) setCurrentTime(audio.currentTime); };
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        nextTrack();
      }
    };
    const onWait = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('waiting', onWait);
    audio.addEventListener('canplay', onCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('waiting', onWait);
      audio.removeEventListener('canplay', onCanPlay);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repeat]);

  // ── Load new track ──────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (currentTrack.src === prevSrcRef.current) return;
    prevSrcRef.current = currentTrack.src;
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    audio.src = currentTrack.src;
    audio.load();
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  // ── Play / Pause ────────────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack, setPlaying]);

  // ── Volume / Mute ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (!isVisible) return;
      const audio = audioRef.current;
      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (audio) audio.currentTime = Math.min(audio.currentTime + 10, duration);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (audio) audio.currentTime = Math.max(audio.currentTime - 10, 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(volume + 0.1, 1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(volume - 0.1, 0));
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isVisible, togglePlay, setVolume, volume, duration]);

  // ── Seek ────────────────────────────────────────────────────────────────────

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) audioRef.current.currentTime = val;
  }, []);

  const nextRepeat = (): RepeatMode => {
    if (repeat === 'none') return 'all';
    if (repeat === 'all') return 'one';
    return 'none';
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────

  if (!isVisible || !currentTrack) return null;

  const iconBtn = (
    style?: React.CSSProperties
  ): React.CSSProperties => ({
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    padding: 6,
    transition: 'all 0.2s',
    ...style,
  });

  // ── Mini player ─────────────────────────────────────────────────────────────

  if (isMini) {
    return (
      <AnimatePresence>
        <motion.div
          key="mini"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '8px 16px 8px 8px',
            borderRadius: 50,
            background: 'rgba(22,22,31,0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(124,58,237,0.35)',
            boxShadow: '0 8px 40px rgba(124,58,237,0.3)',
            minWidth: 260,
            maxWidth: '90vw',
          }}
        >
          {/* Album art */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              overflow: 'hidden',
              position: 'relative',
              flexShrink: 0,
              background: 'var(--bg-secondary)',
              animation: isPlaying ? 'spin-slow 8s linear infinite' : 'none',
            }}
          >
            {currentTrack.thumbnail ? (
              <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill style={{ objectFit: 'cover' }} unoptimized />
            ) : (
              <Music2 size={16} color="var(--text-muted)" style={{ margin: '10px' }} />
            )}
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentTrack.title}
            </p>
          </div>

          {/* Controls */}
          <button onClick={() => prevTrack()} style={iconBtn({ color: 'var(--text-secondary)' })}>
            <SkipBack size={14} />
          </button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={togglePlay}
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'var(--gradient-1)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isPlaying ? <Pause size={14} fill="white" color="white" /> : <Play size={14} fill="white" color="white" />}
          </motion.button>
          <button onClick={() => nextTrack()} style={iconBtn({ color: 'var(--text-secondary)' })}>
            <SkipForward size={14} />
          </button>
          <button onClick={toggleMini} style={iconBtn({ color: 'var(--text-secondary)' })} title="Expand">
            <ChevronUp size={14} />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ── Full player ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes spin-slow { to { transform: rotate(360deg); } }
        @keyframes waveBar {
          from { transform: scaleY(0.4); }
          to   { transform: scaleY(1); }
        }
        .player-seek::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 0 6px rgba(124,58,237,0.6);
          cursor: pointer;
          margin-top: -5px;
        }
        .player-seek::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.12);
        }
        .player-vol::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--accent-light);
          cursor: pointer;
          margin-top: -3px;
        }
        .player-vol::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 2px;
          background: rgba(255,255,255,0.12);
        }
        .player-icon-btn:hover { color: var(--text-primary) !important; background: rgba(255,255,255,0.07) !important; }
        .player-icon-active { color: var(--accent-light) !important; }
      `}</style>

      <AnimatePresence>
        <motion.div
          key="player"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 260 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'rgba(12,12,18,0.88)',
            backdropFilter: 'blur(30px)',
            borderTop: '1px solid rgba(124,58,237,0.25)',
            boxShadow: '0 -8px 40px rgba(124,58,237,0.18)',
          }}
        >
          {/* Seek bar – full width on top edge */}
          <div
            style={{ position: 'relative', height: 4, background: 'rgba(255,255,255,0.06)', cursor: 'pointer' }}
          >
            {/* Filled */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #ec4899)',
                borderRadius: 2,
                transition: isSeeking ? 'none' : 'width 0.25s linear',
              }}
            />
            <input
              type="range"
              className="player-seek"
              min={0}
              max={duration || 1}
              step={0.1}
              value={currentTime}
              onMouseDown={() => setIsSeeking(true)}
              onMouseUp={() => setIsSeeking(false)}
              onTouchStart={() => setIsSeeking(true)}
              onTouchEnd={() => setIsSeeking(false)}
              onChange={handleSeek}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                opacity: 0,
                cursor: 'pointer',
                height: '100%',
              }}
            />
          </div>

          {/* Inner layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              padding: '10px 20px 12px',
              gap: 12,
            }}
          >
            {/* ── Left: Track info ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {/* Album art */}
              <motion.div
                animate={{ rotate: isPlaying ? 360 : 0 }}
                transition={{
                  duration: 8,
                  ease: 'linear',
                  repeat: isPlaying ? Infinity : 0,
                }}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  flexShrink: 0,
                  position: 'relative',
                  background: 'var(--bg-secondary)',
                  border: '2px solid rgba(124,58,237,0.4)',
                  boxShadow: isPlaying ? '0 0 14px rgba(124,58,237,0.5)' : 'none',
                }}
              >
                {currentTrack.thumbnail ? (
                  <Image src={currentTrack.thumbnail} alt={currentTrack.title} fill style={{ objectFit: 'cover' }} unoptimized />
                ) : (
                  <Music2 size={20} color="var(--text-muted)" style={{ margin: '14px auto', display: 'block' }} />
                )}
              </motion.div>

              {/* Title / Artist */}
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 200,
                  }}
                >
                  {currentTrack.title}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: 'var(--text-secondary)',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: 180,
                  }}
                >
                  {currentTrack.artist}
                </p>
                {/* Time */}
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {fmtTime(currentTime)} / {fmtTime(duration)}
                </p>
              </div>
            </div>

            {/* ── Centre: Playback controls ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Shuffle */}
              <button
                className={`player-icon-btn ${isShuffle ? 'player-icon-active' : ''}`}
                onClick={toggleShuffle}
                title="Shuffle"
                style={iconBtn({ color: isShuffle ? 'var(--accent-light)' : 'var(--text-muted)' })}
              >
                <Shuffle size={15} />
              </button>

              {/* Prev */}
              <button
                className="player-icon-btn"
                onClick={prevTrack}
                title="Previous"
                style={iconBtn({ color: 'var(--text-secondary)' })}
              >
                <SkipBack size={18} />
              </button>

              {/* Play / Pause */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                whileHover={{ scale: 1.07 }}
                onClick={togglePlay}
                title="Play / Pause (Space)"
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(124,58,237,0.5)',
                  flexShrink: 0,
                  position: 'relative',
                }}
              >
                {isLoading ? (
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin-slow 0.7s linear infinite',
                    }}
                  />
                ) : isPlaying ? (
                  <Pause size={20} fill="white" color="white" />
                ) : (
                  <Play size={20} fill="white" color="white" style={{ marginLeft: 2 }} />
                )}
              </motion.button>

              {/* Next */}
              <button
                className="player-icon-btn"
                onClick={nextTrack}
                title="Next"
                style={iconBtn({ color: 'var(--text-secondary)' })}
              >
                <SkipForward size={18} />
              </button>

              {/* Repeat */}
              <button
                className={`player-icon-btn ${repeat !== 'none' ? 'player-icon-active' : ''}`}
                onClick={() => setRepeat(nextRepeat())}
                title={`Repeat: ${repeat}`}
                style={iconBtn({ color: repeat !== 'none' ? 'var(--accent-light)' : 'var(--text-muted)' })}
              >
                {repeat === 'one' ? <Repeat1 size={15} /> : <Repeat size={15} />}
              </button>
            </div>

            {/* ── Right: Volume + extras ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
              {/* Queue toggle */}
              <button
                className={`player-icon-btn ${showQueue ? 'player-icon-active' : ''}`}
                onClick={() => setShowQueue((p) => !p)}
                title="Queue"
                style={iconBtn({ color: showQueue ? 'var(--accent-light)' : 'var(--text-muted)' })}
              >
                <ListMusic size={16} />
              </button>

              {/* Mute */}
              <button
                className="player-icon-btn"
                onClick={toggleMute}
                style={iconBtn({ color: 'var(--text-secondary)' })}
                title="Mute"
              >
                {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* Volume slider */}
              <div style={{ position: 'relative', width: 80, height: 4 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${isMuted ? 0 : volume * 100}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a855f7)',
                    borderRadius: 2,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="range"
                  className="player-vol"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  title="Volume (↑↓)"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    height: 14,
                    top: -5,
                  }}
                />
                <div
                  style={{
                    height: 4,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                  }}
                />
              </div>

              {/* Mini toggle */}
              <button
                className="player-icon-btn"
                onClick={toggleMini}
                title="Mini player"
                style={iconBtn({ color: 'var(--text-muted)' })}
              >
                <ChevronDown size={16} />
              </button>

              {/* Close */}
              <button
                className="player-icon-btn"
                onClick={() => {
                  setVisible(false);
                  setPlaying(false);
                  if (audioRef.current) audioRef.current.pause();
                }}
                title="Close"
                style={iconBtn({ color: 'var(--text-muted)' })}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* ── Queue panel (slides up) ── */}
          <AnimatePresence>
            {showQueue && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                style={{
                  overflow: 'hidden',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px 4px',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Queue · {queue.length} songs
                  </span>
                </div>
                <QueuePanel
                  queue={queue}
                  queueIndex={queueIndex}
                  onSelect={(i) => {
                    const t = queue[i];
                    if (t) {
                      useStore.setState({
                        queueIndex: i,
                        currentTrack: t,
                        isPlaying: true,
                      });
                    }
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
