'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';
import {
  Download,
  Link2,
  Music2,
  Clock,
  User,
  Copy,
  Loader2,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Play,
  Radio,
} from 'lucide-react';
import { getInfo, startDownload, VideoInfo, formatDuration, getStreamProxyUrl } from '@/lib/api';
import { useStore } from '@/lib/store';
import QualitySelector from '@/components/QualitySelector';
import DownloadQueue from '@/components/DownloadQueue';
import { v4 as uuidv4 } from 'uuid';

type State = 'idle' | 'loading' | 'ready' | 'downloading' | 'done' | 'error';

export default function DownloaderPage() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>('idle');
  const [info, setInfo] = useState<VideoInfo | null>(null);
  const [quality, setQuality] = useState('192');
  const [error, setError] = useState('');
  const [jobId, setJobId] = useState('');
  const [playingOnline, setPlayingOnline] = useState(false);
  const { defaultQuality, addToQueue, addHistory, setTrack } = useStore();

  const handleFetch = useCallback(async () => {
    if (!url.trim()) return toast.error('Please paste a YouTube URL');
    setState('loading');
    setError('');
    setInfo(null);
    try {
      const data = await getInfo(url.trim());
      if (data.type !== 'video') {
        setState('error');
        setError('This looks like a playlist. Please use the Playlist page.');
        return;
      }
      setInfo(data as VideoInfo);
      setQuality(defaultQuality);
      setState('ready');
    } catch (e: any) {
      setState('error');
      setError(e?.response?.data?.error || e.message || 'Failed to fetch video info');
    }
  }, [url, defaultQuality]);

  const handleDownload = useCallback(async () => {
    if (!info) return;
    setState('downloading');
    try {
      const { jobId: jid } = await startDownload(url, quality);
      setJobId(jid);
      const id = uuidv4();
      addToQueue({
        id,
        jobId: jid,
        title: info.title,
        thumbnail: info.thumbnail,
        url,
        quality,
        status: 'queued',
        progress: 0,
      });
      setState('ready');
      toast.success('Added to Queue! Check bottom right.');
    } catch (e: any) {
      setState('error');
      setError(e?.response?.data?.error || 'Failed to start download');
    }
  }, [info, url, quality, addToQueue, addHistory]);

  const handlePlayOnline = useCallback(() => {
    if (!info) return;
    setPlayingOnline(true);
    const streamUrl = getStreamProxyUrl(url);
    setTrack({
      id: info.id,
      title: info.title,
      artist: info.channel,
      thumbnail: info.thumbnail,
      src: streamUrl,
      duration: info.duration,
    });
    toast.success('Streaming online!', { icon: '🎵' });
    setTimeout(() => setPlayingOnline(false), 1500);
  }, [info, url, setTrack]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 120px' }}>
      <DownloadQueue />
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Music2 size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Song Downloader</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Paste a YouTube video link to download it as MP3
          </p>
        </motion.div>

        {/* URL Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ marginBottom: '24px' }}
        >
          <div
            style={{
              display: 'flex',
              gap: '10px',
              padding: '6px 6px 6px 16px',
              borderRadius: '16px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              alignItems: 'center',
            }}
          >
            <Link2 size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="input-field"
              style={{ border: 'none', background: 'transparent', padding: '10px 0', flex: 1 }}
              placeholder="https://youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={handleFetch}
              disabled={state === 'loading'}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {state === 'loading' ? (
                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Fetching...</>
              ) : (
                'Get Info'
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--red)' }}>Error</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 4 }}>{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading skeleton */}
        <AnimatePresence>
          {state === 'loading' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ borderRadius: '20px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 200, width: '100%' }} />
                <div style={{ padding: '20px' }}>
                  <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: '12px' }} />
                  <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: '8px' }} />
                  <div className="skeleton" style={{ height: 14, width: '30%' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Video Info Card */}
        <AnimatePresence>
          {(state === 'ready' || state === 'downloading' || state === 'done') && info && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                marginBottom: '24px',
              }}
            >
              {/* Thumbnail */}
              <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                <Image src={info.thumbnail} alt={info.title} fill style={{ objectFit: 'cover' }} unoptimized />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                {info.duration > 0 && (
                  <div style={{
                    position: 'absolute', bottom: 12, right: 12,
                    background: 'rgba(0,0,0,0.8)', color: 'white',
                    fontSize: '13px', fontWeight: 600,
                    padding: '4px 10px', borderRadius: '8px',
                  }}>
                    {formatDuration(info.duration)}
                  </div>
                )}
              </div>

              <div style={{ padding: '20px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, lineHeight: 1.4, marginBottom: '10px' }}>{info.title}</h2>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '20px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <User size={13} /> {info.channel}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <Clock size={13} /> {formatDuration(info.duration)}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Play Online */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePlayOnline}
                    disabled={playingOnline}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      fontSize: '13px', padding: '9px 16px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(236,72,153,0.2))',
                      border: '1px solid rgba(124,58,237,0.4)',
                      color: 'var(--accent-light)', cursor: 'pointer', fontWeight: 600,
                      transition: 'all 0.2s',
                    }}
                  >
                    {playingOnline
                      ? <><Radio size={13} style={{ animation: 'pulse 1s infinite' }} /> Streaming...</>
                      : <><Play size={13} fill="currentColor" /> Play Online</>}
                  </motion.button>
                  <button
                    className="btn-ghost"
                    style={{ fontSize: '12px', padding: '8px 12px' }}
                    onClick={() => {
                      navigator.clipboard.writeText(url);
                      toast.success('Link copied!');
                    }}
                  >
                    <Copy size={13} style={{ marginRight: 4 }} /> Copy Link
                  </button>
                  <a href={info.url} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--text-primary)' }}>
                    <ExternalLink size={13} /> Open on YouTube
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quality + Download */}
        <AnimatePresence>
          {(state === 'ready' || state === 'downloading' || state === 'done') && info && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                padding: '24px',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                Audio Quality
              </label>
              <QualitySelector value={quality} onChange={setQuality} />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={handleDownload}
                disabled={state === 'downloading'}
                style={{
                  width: '100%',
                  marginTop: '20px',
                  padding: '14px',
                  fontSize: '15px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {state === 'downloading' ? (
                  <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                ) : (
                  <><Download size={18} /> Download MP3</>
                )}
              </motion.button>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                By downloading, you confirm you have the right to download this content.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
      `}</style>
    </div>
  );
}
