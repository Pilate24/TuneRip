'use client';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';
import {
  List,
  Link2,
  Loader2,
  Download,
  AlertCircle,
  CheckSquare,
  Square,
  Archive,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';
import { getInfo, startPlaylistDownload, PlaylistItem, PlaylistInfo, formatDuration } from '@/lib/api';
import { useStore } from '@/lib/store';
import QualitySelector from '@/components/QualitySelector';
import DownloadQueue from '@/components/DownloadQueue';
import { v4 as uuidv4 } from 'uuid';

const AIPlaylistGenerator = dynamic(() => import('@/components/AIPlaylistGenerator'), { ssr: false });


type State = 'idle' | 'loading' | 'ready' | 'downloading' | 'done' | 'error';
type PageTab = 'downloader' | 'ai';

export default function PlaylistPage() {
  const [pageTab, setPageTab] = useState<PageTab>('downloader');
  const [url, setUrl] = useState('');
  const [state, setState] = useState<State>('idle');
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [quality, setQuality] = useState('192');
  const [error, setError] = useState('');
  const [showAll, setShowAll] = useState(false);
  const { defaultQuality, addToQueue, addHistory } = useStore();

  const handleFetch = useCallback(async () => {
    if (!url.trim()) return toast.error('Please paste a YouTube playlist URL');
    setState('loading');
    setError('');
    setPlaylist([]);
    setSelected(new Set());
    try {
      const data = await getInfo(url.trim());
      if (data.type !== 'playlist') {
        setState('error');
        setError('This looks like a single video. Please use the Song Downloader page.');
        return;
      }
      const items = (data as PlaylistInfo).items;
      setPlaylist(items);
      setSelected(new Set(items.map((i) => i.id)));
      setQuality(defaultQuality);
      setState('ready');
      toast.success(`Found ${items.length} tracks!`);
    } catch (e: any) {
      setState('error');
      setError(e?.response?.data?.error || e.message || 'Failed to fetch playlist');
    }
  }, [url, defaultQuality]);

  const toggleItem = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(selected.size === playlist.length ? new Set() : new Set(playlist.map((i) => i.id)));
  };

  const handleDownload = useCallback(async () => {
    const selectedItems = playlist.filter((i) => selected.has(i.id));
    if (selectedItems.length === 0) return toast.error('Select at least one track');

    setState('downloading');
    try {
      const urls = selectedItems.map((i) => i.url);
      const { jobId: jid } = await startPlaylistDownload(urls, quality);
      const id = uuidv4();
      addToQueue({
        id,
        jobId: jid,
        title: `Playlist (${selectedItems.length} tracks)`,
        thumbnail: selectedItems[0]?.thumbnail || '',
        url,
        quality,
        status: 'downloading',
        progress: 0,
      });
      addHistory({
        id,
        title: `Playlist (${selectedItems.length} tracks)`,
        thumbnail: selectedItems[0]?.thumbnail || '',
        channel: selectedItems[0]?.channel || '',
        duration: 0,
        quality,
        url,
        downloadedAt: new Date().toISOString(),
        type: 'playlist',
      });
      setState('done');
      toast.success('Playlist download started! Check the queue.', { duration: 4000 });
    } catch (e: any) {
      setState('error');
      setError(e?.response?.data?.error || 'Failed to start download');
    }
  }, [playlist, selected, quality, url, addToQueue, addHistory]);

  const visibleItems = showAll ? playlist : playlist.slice(0, 10);

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 120px' }}>
      <DownloadQueue />
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '32px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--gradient-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <List size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Playlist</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
            Download playlists or let AI generate one from your music library
          </p>
        </motion.div>

        {/* Tab switcher */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', marginBottom: 28 }}
        >
          {([
            { id: 'downloader', label: 'Playlist Downloader', icon: <Archive size={15} /> },
            { id: 'ai', label: '🤖 AI Playlists', icon: <Sparkles size={15} /> },
          ] as const).map(({ id, label, icon }) => (
            <button key={id} onClick={() => setPageTab(id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, transition: 'all 0.2s',
                background: pageTab === id ? 'var(--gradient-1)' : 'transparent',
                color: pageTab === id ? 'white' : 'var(--text-muted)',
                boxShadow: pageTab === id ? '0 2px 14px rgba(124,58,237,0.35)' : 'none',
              }}
            >
              {icon} {label}
            </button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── AI Playlists tab ── */}
          {pageTab === 'ai' && (
            <motion.div key="ai" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <AIPlaylistGenerator />
            </motion.div>
          )}

          {/* ── Downloader tab ── */}
          {pageTab === 'downloader' && (
            <motion.div key="dl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>

        {/* URL Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '10px', padding: '6px 6px 6px 16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', alignItems: 'center' }}>
            <Link2 size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              className="input-field"
              style={{ border: 'none', background: 'transparent', padding: '10px 0', flex: 1 }}
              placeholder="https://youtube.com/playlist?list=..."
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
              {state === 'loading' ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</> : 'Load Playlist'}
            </motion.button>
          </div>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {state === 'error' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <AlertCircle size={18} style={{ color: 'var(--red)', flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Playlist items */}
        <AnimatePresence>
          {state === 'ready' || state === 'downloading' || state === 'done' ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    onClick={toggleAll}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: '13px', fontWeight: 600 }}
                  >
                    {selected.size === playlist.length ? <CheckSquare size={16} /> : <Square size={16} />}
                    {selected.size === playlist.length ? 'Deselect All' : 'Select All'}
                  </button>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {selected.size} / {playlist.length} selected
                  </span>
                </div>
                <QualitySelector value={quality} onChange={setQuality} />
              </div>

              {/* Track list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                {visibleItems.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() => toggleItem(item.id)}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'center',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: 'var(--bg-card)',
                      border: selected.has(item.id) ? '1px solid rgba(124,58,237,0.4)' : '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {selected.has(item.id) ? (
                      <CheckSquare size={18} style={{ color: 'var(--accent-light)', flexShrink: 0 }} />
                    ) : (
                      <Square size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <div style={{ position: 'relative', width: 56, height: 42, borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
                      <Image src={item.thumbnail} alt={item.title} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>{item.channel}</p>
                    </div>
                    {item.duration > 0 && (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>

              {playlist.length > 10 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: '13px', fontWeight: 600, margin: '0 auto 20px', padding: '8px 16px' }}
                >
                  {showAll ? <><ChevronUp size={15} /> Show Less</> : <><ChevronDown size={15} /> Show All {playlist.length} Tracks</>}
                </button>
              )}

              {/* Download button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                onClick={handleDownload}
                disabled={state === 'downloading' || state === 'done' || selected.size === 0}
                style={{ width: '100%', padding: '14px', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {state === 'done' ? (
                  <><Archive size={18} /> Downloading ZIP...</>
                ) : (
                  <><Archive size={18} /> Download {selected.size} Tracks as ZIP</>
                )}
              </motion.button>

              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
                By downloading, you confirm you have the right to download this content.
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
        </motion.div>
        )}
        </AnimatePresence>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
