'use client';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { formatDuration } from '@/lib/api';
import { Clock, User, Eye } from 'lucide-react';

interface VideoCardProps {
  title: string;
  thumbnail: string;
  duration: number;
  channel: string;
  viewCount?: number;
  compact?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

export default function VideoCard({
  title,
  thumbnail,
  duration,
  channel,
  viewCount,
  compact = false,
  onClick,
  selected = false,
}: VideoCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      style={{
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: selected
          ? '1px solid var(--accent)'
          : '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.2s',
        boxShadow: selected ? '0 0 20px var(--accent-glow)' : 'none',
      }}
    >
      {!compact && (
        <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%' }}>
          <Image
            src={thumbnail}
            alt={title}
            fill
            style={{ objectFit: 'cover' }}
            unoptimized
          />
          {duration > 0 && (
            <div
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                fontSize: '12px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '6px',
                backdropFilter: 'blur(4px)',
              }}
            >
              {formatDuration(duration)}
            </div>
          )}
          {selected && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(124,58,237,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ✓
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ padding: compact ? '10px 12px' : '14px 16px' }}>
        {compact && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ position: 'relative', width: 64, height: 48, flexShrink: 0, borderRadius: '8px', overflow: 'hidden' }}>
              <Image src={thumbnail} alt={title} fill style={{ objectFit: 'cover' }} unoptimized />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: 2 }}>{channel}</p>
            </div>
            {duration > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                {formatDuration(duration)}
              </span>
            )}
          </div>
        )}

        {!compact && (
          <>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {title}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <User size={11} /> {channel}
              </span>
              {duration > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Clock size={11} /> {formatDuration(duration)}
                </span>
              )}
              {viewCount && viewCount > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <Eye size={11} /> {(viewCount / 1000).toFixed(0)}K
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
