'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Play, Plus, Music2 } from 'lucide-react';
import type { PlayerTrack, MoodType } from '@/lib/store';
import { MOODS } from '@/lib/playlistAI';

interface RecommendationCardProps {
  track: PlayerTrack;
  mood: MoodType;
  index: number;
  onPlay: (track: PlayerTrack) => void;
  onAddToQueue: (track: PlayerTrack) => void;
}

export default function RecommendationCard({
  track, mood, index, onPlay, onAddToQueue,
}: RecommendationCardProps) {
  const moodCfg = MOODS[mood];

  const fmtDur = (s?: number) => {
    if (!s) return '';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 260, damping: 24 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderRadius: 14,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        transition: 'all 0.18s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      whileHover={{ borderColor: 'rgba(124,58,237,0.4)', translateY: -1 }}
    >
      {/* Subtle left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, borderRadius: '4px 0 0 4px', background: moodCfg.gradient }} />

      {/* Track number */}
      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', minWidth: 20, textAlign: 'right', flexShrink: 0 }}>
        {index + 1}
      </span>

      {/* Thumbnail */}
      <motion.div
        whileHover={{ scale: 1.06 }}
        style={{ width: 42, height: 42, borderRadius: 8, overflow: 'hidden', position: 'relative', flexShrink: 0, background: 'var(--bg-secondary)', cursor: 'pointer' }}
        onClick={() => onPlay(track)}
      >
        {track.thumbnail ? (
          <Image src={track.thumbnail} alt={track.title} fill style={{ objectFit: 'cover' }} unoptimized />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music2 size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
        )}
        {/* Play overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }} className="thumb-overlay">
          <Play size={14} fill="white" color="white" />
        </div>
      </motion.div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.title}
        </p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </p>
      </div>

      {/* Mood badge */}
      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${moodCfg.color}18`, border: `1px solid ${moodCfg.color}40`, color: moodCfg.color, fontWeight: 700, flexShrink: 0 }}>
        {moodCfg.emoji} {moodCfg.label}
      </span>

      {/* Duration */}
      {track.duration && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, minWidth: 34, textAlign: 'right' }}>
          {fmtDur(track.duration)}
        </span>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.08 }}
          onClick={() => onPlay(track)}
          title="Play now"
          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--gradient-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Play size={12} fill="white" color="white" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.08 }}
          onClick={() => onAddToQueue(track)}
          title="Add to queue"
          style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-glass)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}
        >
          <Plus size={13} />
        </motion.button>
      </div>

      <style>{`.thumb-overlay { opacity: 0 !important; } div:hover > .thumb-overlay { opacity: 1 !important; }`}</style>
    </motion.div>
  );
}
