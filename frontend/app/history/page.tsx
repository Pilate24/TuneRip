'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore, HistoryEntry } from '@/lib/store';
import { History, Trash2, Download, ExternalLink, Music2, List, Clock, Play, Radio } from 'lucide-react';
import { formatDuration, getStreamProxyUrl } from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function HistoryPage() {
  const { history, removeHistory, clearHistory, setTrack, queue: playerQueue } = useStore();
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePlay = (item: HistoryEntry, idx: number) => {
    if (!item.jobId) {
      toast.error('Audio file not available. Re-download the song to play it.', { icon: '⚠️' });
      return;
    }
    // Build queue from all history items that have a jobId
    const playable = history.filter((h) => !!h.jobId);
    const tracks = playable.map((h) => ({
      id: h.id,
      title: h.title,
      artist: h.channel,
      thumbnail: h.thumbnail,
      src: `${API_BASE}/api/file/${h.jobId}`,
      duration: h.duration,
    }));
    const trackIdx = playable.findIndex((h) => h.id === item.id);
    const track = tracks[trackIdx] ?? tracks[0];
    setTrack(track, tracks, trackIdx >= 0 ? trackIdx : 0);
    toast.success('Now playing!', { icon: '🎵' });
  };

  const handlePlayOnline = (item: HistoryEntry) => {
    setStreamingId(item.id);
    const streamUrl = getStreamProxyUrl(item.url);
    // Build online queue from all history items
    const tracks = history.map((h) => ({
      id: h.id,
      title: h.title,
      artist: h.channel,
      thumbnail: h.thumbnail,
      src: getStreamProxyUrl(h.url),
      duration: h.duration,
    }));
    const idx = history.findIndex((h) => h.id === item.id);
    setTrack(
      { id: item.id, title: item.title, artist: item.channel, thumbnail: item.thumbnail, src: streamUrl, duration: item.duration },
      tracks,
      idx >= 0 ? idx : 0,
    );
    toast.success('Streaming online!', { icon: '🎵' });
    setTimeout(() => setStreamingId(null), 1500);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 100px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={22} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Download History</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{history.length} downloads</p>
              </div>
            </div>
            {history.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  clearHistory();
                  toast.success('History cleared');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Trash2 size={14} /> Clear All
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Empty state */}
        {history.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '80px 20px' }}
          >
            <div style={{ width: 72, height: 72, borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <History size={32} style={{ color: 'var(--text-muted)' }} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>No downloads yet</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Your download history will appear here once you start downloading.
            </p>
          </motion.div>
        )}

        {/* History list */}
        <AnimatePresence>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.map((item, i) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              >
                {/* Thumbnail – click to play */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    position: 'relative',
                    width: 72,
                    height: 54,
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    cursor: item.jobId ? 'pointer' : 'default',
                  }}
                  onClick={() => handlePlay(item, i)}
                >
                  {item.thumbnail ? (
                    <Image src={item.thumbnail} alt={item.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music2 size={20} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  )}
                  {/* Play overlay */}
                  {item.jobId && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      className="play-overlay"
                    >
                      <Play size={18} fill="white" color="white" />
                    </div>
                  )}
                </motion.div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                    <p
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        cursor: item.jobId ? 'pointer' : 'default',
                      }}
                      onClick={() => handlePlay(item, i)}
                    >
                      {item.title}
                    </p>
                    <span className="tag" style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {item.type === 'playlist' ? <List size={10} /> : <Music2 size={10} />}
                      {item.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{item.channel}</span>
                    {item.duration > 0 && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <Clock size={10} /> {formatDuration(item.duration)}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {item.quality}kbps • {formatDate(item.downloadedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {/* Play Downloaded */}
                  {item.jobId && (
                    <motion.button
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.93 }}
                      onClick={() => handlePlay(item, i)}
                      title="Play downloaded file"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        background: 'var(--gradient-1)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      <Play size={13} fill="white" color="white" />
                    </motion.button>
                  )}

                  {/* Play Online (stream from YouTube) */}
                  <motion.button
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.93 }}
                    onClick={() => handlePlayOnline(item)}
                    title="Stream online from YouTube"
                    disabled={streamingId === item.id}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: streamingId === item.id
                        ? 'rgba(124,58,237,0.3)'
                        : 'rgba(124,58,237,0.12)',
                      border: '1px solid rgba(124,58,237,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      color: 'var(--accent-light)',
                    }}
                  >
                    {streamingId === item.id
                      ? <Radio size={13} style={{ animation: 'pulse 1s infinite' }} />
                      : <Radio size={13} />}
                  </motion.button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open on YouTube"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-secondary)',
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={13} />
                  </a>
                  <button
                    onClick={() => {
                      removeHistory(item.id);
                      toast.success('Removed from history');
                    }}
                    title="Remove"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '8px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .play-overlay { opacity: 0 !important; }
        div:hover > .play-overlay { opacity: 1 !important; }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  );
}
