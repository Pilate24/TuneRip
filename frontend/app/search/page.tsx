'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { Search, Music2, Download, Clock, User, Loader2, X, Play, Radio } from 'lucide-react';
import { searchYouTube, startDownload, SearchResult, formatDuration, getStreamProxyUrl } from '@/lib/api';
import { useStore } from '@/lib/store';
import QualitySelector from '@/components/QualitySelector';
import DownloadQueue from '@/components/DownloadQueue';
import { v4 as uuidv4 } from 'uuid';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [quality, setQuality] = useState('192');
  const [downloading, setDownloading] = useState<string | null>(null);
  const [playingOnline, setPlayingOnline] = useState<string | null>(null);
  const { defaultQuality, addToQueue, addHistory, setTrack } = useStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return toast.error('Please enter a search query');
    setLoading(true);
    setResults([]);
    try {
      const res = await searchYouTube(query, 10);
      setResults(res);
      setQuality(defaultQuality);
      if (res.length === 0) toast('No results found', { icon: '🔍' });
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, defaultQuality]);

  const handleDownload = useCallback(async (result: SearchResult) => {
    setDownloading(result.id);
    try {
      const { jobId: jid } = await startDownload(result.url, quality);
      const id = uuidv4();
      addToQueue({
        id,
        jobId: jid,
        title: result.title,
        thumbnail: result.thumbnail,
        url: result.url,
        quality,
        status: 'downloading',
        progress: 0,
      });
      addHistory({
        id,
        title: result.title,
        thumbnail: result.thumbnail,
        channel: result.channel,
        duration: result.duration,
        quality,
        url: result.url,
        downloadedAt: new Date().toISOString(),
        type: 'video',
      });
      toast.success('Download started! Check the queue.');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Download failed');
    } finally {
      setDownloading(null);
    }
  }, [quality, addToQueue, addHistory]);

  const handlePlayOnline = useCallback((result: SearchResult) => {
    setPlayingOnline(result.id);
    const streamUrl = getStreamProxyUrl(result.url);
    const allTracks = results.map((r) => ({
      id: r.id,
      title: r.title,
      artist: r.channel,
      thumbnail: r.thumbnail,
      src: getStreamProxyUrl(r.url),
      duration: r.duration,
    }));
    const idx = results.findIndex((r) => r.id === result.id);
    setTrack(
      { id: result.id, title: result.title, artist: result.channel, thumbnail: result.thumbnail, src: streamUrl, duration: result.duration },
      allTracks,
      idx >= 0 ? idx : 0,
    );
    toast.success('Streaming online!', { icon: '🎵' });
    setTimeout(() => setPlayingOnline(null), 1500);
  }, [results, setTrack]);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 120px' }}>
      <DownloadQueue />
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--gradient-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Search size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Search Music</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Search YouTube — stream online or download as MP3
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', gap: '10px', padding: '6px 6px 6px 16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', alignItems: 'center' }}>
            <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="input-field"
              style={{ border: 'none', background: 'transparent', padding: '10px 0', flex: 1 }}
              placeholder="Search for songs, artists, albums..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            )}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={handleSearch}
              disabled={loading}
              style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              {loading ? 'Searching...' : 'Search'}
            </motion.button>
          </div>
        </motion.div>

        {/* Quality selector */}
        {results.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Download Quality:</span>
            <QualitySelector value={quality} onChange={setQuality} />
          </motion.div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="skeleton" style={{ height: 160 }} />
                <div style={{ padding: '14px' }}>
                  <div className="skeleton" style={{ height: 16, marginBottom: '8px', width: '80%' }} />
                  <div className="skeleton" style={{ height: 12, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}
            >
              {results.map((result, i) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    transition: 'border-color 0.2s, transform 0.2s',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', width: '100%' }}>
                    <Image src={result.thumbnail} alt={result.title} fill style={{ objectFit: 'cover' }} unoptimized />
                    {result.duration > 0 && (
                      <div style={{ position: 'absolute', bottom: 8, right: 8, background: 'rgba(0,0,0,0.8)', color: 'white', fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px' }}>
                        {formatDuration(result.duration)}
                      </div>
                    )}
                    {/* Play overlay on hover */}
                    <motion.button
                      whileHover={{ opacity: 1 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: playingOnline === result.id ? 1 : 0 }}
                      whileFocus={{ opacity: 1 }}
                      onClick={() => handlePlayOnline(result)}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(4px)',
                        border: 'none',
                        cursor: 'pointer',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                      }}
                      className="play-overlay"
                    >
                      <div style={{
                        width: 52, height: 52, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(124,58,237,0.6)',
                      }}>
                        <Play size={22} fill="white" color="white" style={{ marginLeft: 3 }} />
                      </div>
                    </motion.button>
                  </div>

                  <div style={{ padding: '14px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 600, lineHeight: 1.4, marginBottom: '6px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {result.title}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <User size={10} /> {result.channel}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Play Online */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handlePlayOnline(result)}
                        disabled={playingOnline === result.id}
                        style={{
                          flex: 1,
                          padding: '9px 0',
                          fontSize: '13px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          borderRadius: '10px',
                          background: 'rgba(124,58,237,0.12)',
                          border: '1px solid rgba(124,58,237,0.3)',
                          color: 'var(--accent-light)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                      >
                        {playingOnline === result.id ? (
                          <><Radio size={13} style={{ animation: 'pulse 1s infinite' }} /> Playing...</>
                        ) : (
                          <><Play size={13} fill="currentColor" /> Play</>
                        )}
                      </motion.button>

                      {/* Download */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        className="btn-primary"
                        onClick={() => handleDownload(result)}
                        disabled={downloading === result.id}
                        style={{ flex: 1, padding: '9px 0', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        {downloading === result.id ? (
                          <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Starting...</>
                        ) : (
                          <><Download size={13} /> Save</>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .play-overlay:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
