'use client';
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useStore } from '@/lib/store';
import { getFileUrl, startDownload } from '@/lib/api';
import { Download, X, CheckCircle, AlertCircle, Loader, Music, RefreshCw, XCircle, Play, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';

import { API_BASE } from '@/lib/api';

export default function DownloadQueue() {
  const {
    downloadQueue,
    updateQueueByJobId,
    updateQueue,
    removeFromQueue,
    clearCompletedFromQueue,
    addHistory,
    setTrack,
  } = useStore();
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const connectSocket = (url: string) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = io(url, {
        reconnectionDelayMax: 10000,
      });

      socketRef.current.on('connect', () => {
        // Request status for all active jobs to sync state on reconnect
        const activeJobs = useStore.getState().downloadQueue
          .filter(j => j.jobId && !['done', 'failed', 'error'].includes(j.status))
          .map(j => j.jobId);
        
        if (activeJobs.length > 0) {
          socketRef.current?.emit('request-status', activeJobs);
        }
      });

      socketRef.current.on('progress', (data) => {
        const { jobId, status, progress, error, title, thumbnail } = data;
        
        const jobs = useStore.getState().downloadQueue;
        const matchingJobs = jobs.filter((j) => j.jobId === jobId);

        if (matchingJobs.length === 0) return;

        matchingJobs.forEach((job) => {
          // If just completing now
          if (job.status !== 'done' && status === 'done') {
            updateQueueByJobId(jobId, { status, progress: 100, title: title || job.title, thumbnail: thumbnail || job.thumbnail });
            toast.success(`Ready: ${title || job.title}`);

            // 1. Auto-trigger the file download if not already done
            if (!job.autoDownloaded) {
              const link = document.createElement('a');
              link.href = getFileUrl(jobId);
              link.setAttribute('download', '');
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              updateQueue(job.id, { autoDownloaded: true });
            }

            // 2. Add to history
            if (!job.movedToHistory) {
              addHistory({
                id: job.id, // Keep same ID so we don't duplicate
                title: title || job.title,
                thumbnail: thumbnail || job.thumbnail,
                channel: 'YouTube',
                duration: 0, // We might not have this, API can supply it if needed
                quality: job.quality,
                url: job.url,
                downloadedAt: new Date().toISOString(),
                type: 'video',
                jobId,
              });
              updateQueue(job.id, { movedToHistory: true });
            }
            
            // Remove from queue after 5 seconds to keep it clean, but let user see it finished
            setTimeout(() => {
              // Only remove if it's still in the queue and done
              const currentJob = useStore.getState().downloadQueue.find(j => j.id === job.id);
              if (currentJob && currentJob.status === 'done') {
                 removeFromQueue(job.id);
              }
            }, 8000);

          } else if (job.status !== status || job.progress !== progress) {
            // Update progress/status
            updateQueueByJobId(jobId, { status, progress, error, title: title || job.title, thumbnail: thumbnail || job.thumbnail });
            if ((status === 'error' || status === 'failed') && job.status !== 'error' && job.status !== 'failed') {
              toast.error(`Failed: ${error || 'Download error'}`);
            }
          }
        });
      });
    };

    // Initial connect
    connectSocket(API_BASE);

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [updateQueueByJobId, updateQueue, addHistory, removeFromQueue]);

  const handleCancel = async (jobId: string) => {
    try {
      await fetch(`${API_BASE}/api/download/${jobId}`, { method: 'DELETE' });
    } catch {}
  };

  const handleRetry = async (job: any) => {
    updateQueue(job.id, { status: 'queued', progress: 0, error: undefined });
    try {
      if (job.jobId) {
        // Use retry endpoint
        const res = await fetch(`${API_BASE}/api/retry/${job.jobId}`, { method: 'POST' });
        const data = await res.json();
        if (data.jobId) {
           updateQueue(job.id, { jobId: data.jobId });
        }
      } else {
        // Fallback to start new
        const { jobId } = await startDownload(job.url, job.quality);
        updateQueue(job.id, { jobId });
      }
    } catch (e: any) {
      updateQueue(job.id, { status: 'error', error: e.message || 'Retry failed' });
    }
  };

  const handlePlayInBrowser = (job: any) => {
    if (!job.jobId) return;
    const src = getFileUrl(job.jobId);
    const track = {
      id: job.id,
      title: job.title,
      artist: 'YouTube',
      thumbnail: job.thumbnail,
      src,
    };
    // Build full queue from done items + history
    const history = useStore.getState().history;
    const tracks = history.filter(h => h.jobId).map((h) => ({
      id: h.id,
      title: h.title,
      artist: h.channel || 'YouTube',
      thumbnail: h.thumbnail,
      src: getFileUrl(h.jobId!),
    }));
    
    // If current track isn't in history yet, add it to current playlist
    const idx = tracks.findIndex((t) => t.id === job.id);
    const finalTracks = idx >= 0 ? tracks : [track, ...tracks];
    const finalIdx = idx >= 0 ? idx : 0;
    
    setTrack(track, finalTracks.length > 0 ? finalTracks : [track], finalIdx);
    toast.success('Now playing in browser!', { icon: '🎵' });
  };

  if (downloadQueue.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90,
        right: 24,
        width: 380,
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '65vh',
        pointerEvents: 'none', // Let clicks pass through empty space
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', backdropFilter: 'blur(20px)', pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Music size={14} className="text-accent-light" /> Downloads ({downloadQueue.length})
        </span>
        <button
          onClick={clearCompletedFromQueue}
          title="Clear completed"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
        <AnimatePresence mode="popLayout">
          {[...downloadQueue].reverse().map((job) => (
            <motion.div
              layout
              key={job.id}
              initial={{ x: 100, opacity: 0, scale: 0.95 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 100, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '12px',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Subtle background progress indicator */}
              {(job.status === 'downloading' || job.status === 'converting') && (
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${job.progress}%`,
                  background: job.status === 'converting' ? 'rgba(234, 179, 8, 0.05)' : 'var(--gradient-1)',
                  opacity: 0.1,
                  transition: 'width 0.3s ease',
                  zIndex: 0
                }} />
              )}

              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                {job.thumbnail ? (
                  <div style={{ width: 52, height: 40, borderRadius: '8px', overflow: 'hidden', flexShrink: 0, position: 'relative', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                    <Image src={job.thumbnail} alt={job.title} fill style={{ objectFit: 'cover' }} unoptimized />
                  </div>
                ) : (
                  <div style={{ width: 52, height: 40, borderRadius: '8px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music size={16} color="var(--text-muted)" />
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '20px' }}>
                    {job.title || job.url}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500, textTransform: 'capitalize' }}>
                      {job.quality}kbps • {job.status === 'downloading' || job.status === 'converting' ? `${job.progress}%` : job.status}
                    </span>
                    {(job.status === 'queued' || job.status === 'downloading' || job.status === 'converting') && (
                      <Loader size={12} style={{ color: 'var(--accent-light)', animation: 'spin 1s linear infinite' }} />
                    )}
                    {job.status === 'done' && (
                      <CheckCircle size={14} style={{ color: 'var(--green)' }} />
                    )}
                    {(job.status === 'error' || job.status === 'failed') && (
                      <AlertCircle size={14} style={{ color: 'var(--red)' }} />
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {job.status === 'done' && job.jobId && (
                      <>
                        <button
                          onClick={() => handlePlayInBrowser(job)}
                          style={{
                            background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 600, color: 'var(--green)', transition: 'all 0.2s'
                          }}
                        >
                          <Play size={10} fill="currentColor" /> Play
                        </button>
                        <a
                          href={getFileUrl(job.jobId)}
                          download
                          style={{
                            background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer',
                            display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', transition: 'all 0.2s'
                          }}
                        >
                          <Download size={10} /> Save
                        </a>
                      </>
                    )}

                    {(job.status === 'queued' || job.status === 'downloading' || job.status === 'converting') && job.jobId && (
                      <button
                        onClick={() => handleCancel(job.jobId!)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 600, color: 'var(--red)', transition: 'all 0.2s'
                        }}
                      >
                        <XCircle size={10} /> Cancel
                      </button>
                    )}

                    {(job.status === 'error' || job.status === 'failed') && (
                      <button
                        onClick={() => handleRetry(job)}
                        style={{
                          background: 'var(--bg-elevated)', border: '1px solid var(--border)', cursor: 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px',
                          fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', transition: 'all 0.2s'
                        }}
                      >
                        <RefreshCw size={10} /> Retry
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => removeFromQueue(job.id)}
                  style={{ position: 'absolute', top: 0, right: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px', opacity: 0.6 }}
                  title="Remove from queue"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
