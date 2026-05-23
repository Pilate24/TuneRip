'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import type { MoodType, PlayerTrack, SmartPlaylist } from '@/lib/store';
import { MOODS, generatePlaylist, getTimeOfDayMood, findSimilar, shuffleIntelligent } from '@/lib/playlistAI';
import RecommendationCard from './RecommendationCard';
import {
  Sparkles, Play, Save, Trash2, Clock, Wand2, Shuffle, Music2, BookOpen,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

// ─── Mood Card ────────────────────────────────────────────────────────────────

function MoodCard({
  mood, selected, onSelect,
}: { mood: MoodType; selected: boolean; onSelect: () => void }) {
  const cfg = MOODS[mood];
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.04, y: -3 }}
      whileTap={{ scale: 0.96 }}
      style={{
        padding: '18px 12px',
        borderRadius: 16,
        border: `2px solid ${selected ? cfg.color : 'var(--border)'}`,
        background: selected ? `${cfg.gradient}, rgba(0,0,0,0.4)` : 'var(--bg-card)',
        backgroundBlendMode: selected ? 'overlay' : 'normal',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s ease',
        boxShadow: selected ? `0 0 0 3px ${cfg.color}30, 0 8px 30px rgba(0,0,0,0.3)` : 'none',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', inset: 0, background: cfg.gradient, opacity: 0.15, pointerEvents: 'none' }} />
      )}
      <div style={{ fontSize: 28, marginBottom: 6 }}>{cfg.emoji}</div>
      <p style={{ fontSize: 13, fontWeight: 700, color: selected ? cfg.color : 'var(--text-primary)', marginBottom: 2 }}>{cfg.label}</p>
      <p style={{ fontSize: 10, color: selected ? `${cfg.color}bb` : 'var(--text-muted)', lineHeight: 1.3 }}>{cfg.description}</p>
    </motion.button>
  );
}

// ─── Saved playlist card ──────────────────────────────────────────────────────

function SavedPlaylistCard({
  playlist,
  onPlay,
  onDelete,
}: {
  playlist: SmartPlaylist;
  onPlay: (pl: SmartPlaylist) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = MOODS[playlist.mood];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 14,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: cfg.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 20 }}>
        {cfg.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{playlist.name}</p>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{playlist.tracks.length} tracks · {new Date(playlist.createdAt).toLocaleDateString()}</p>
      </div>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => onPlay(playlist)}
        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: 'var(--gradient-1)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Play size={13} fill="white" color="white" />
      </motion.button>
      <motion.button whileTap={{ scale: 0.9 }} onClick={() => onDelete(playlist.id)}
        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}
      >
        <Trash2 size={13} />
      </motion.button>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AIPlaylistGenerator() {
  const {
    history, smartPlaylists, addSmartPlaylist, removeSmartPlaylist,
    setTrack, queue: playerQueue, currentTrack,
  } = useStore();

  const [selectedMood, setSelectedMood] = useState<MoodType>(() => getTimeOfDayMood());
  const [trackCount, setTrackCount] = useState(15);
  const [generatedTracks, setGeneratedTracks] = useState<PlayerTrack[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [showSaved, setShowSaved] = useState(true);
  const [showDiscover, setShowDiscover] = useState(false);
  const [similarTracks, setSimilarTracks] = useState<PlayerTrack[]>([]);

  const playableHistory = useMemo(() => history.filter((h) => h.jobId && h.type === 'video'), [history]);

  // ── Generate ─────────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!playableHistory.length) {
      toast.error('No downloaded songs found. Download some songs first!', { icon: '🎵' });
      return;
    }
    setIsGenerating(true);
    setHasGenerated(false);
    // Small delay for UX feel
    await new Promise((r) => setTimeout(r, 500));
    const tracks = generatePlaylist(history, selectedMood, trackCount);
    setGeneratedTracks(tracks);
    setIsGenerating(false);
    setHasGenerated(true);
    if (!tracks.length) {
      toast('No matching songs found for this mood. Try downloading more songs!', { icon: '💡' });
    } else {
      toast.success(`Generated ${tracks.length} ${MOODS[selectedMood].label} tracks!`, { icon: MOODS[selectedMood].emoji });
    }
  }, [history, selectedMood, trackCount, playableHistory.length]);

  // ── Play all ─────────────────────────────────────────────────────────────────

  const handlePlayAll = useCallback(() => {
    if (!generatedTracks.length) return;
    const first = generatedTracks[0];
    setTrack(first, generatedTracks, 0);
    toast.success('Playing AI playlist!', { icon: '🎵' });
  }, [generatedTracks, setTrack]);

  // ── Save ──────────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    if (!generatedTracks.length) return;
    const cfg = MOODS[selectedMood];
    const playlist: SmartPlaylist = {
      id: uuidv4(),
      name: `${cfg.emoji} ${cfg.label} Mix`,
      description: cfg.description,
      mood: selectedMood,
      tracks: generatedTracks,
      createdAt: new Date().toISOString(),
      coverColor: cfg.color,
    };
    addSmartPlaylist(playlist);
    toast.success('Playlist saved!', { icon: '💾' });
  }, [generatedTracks, selectedMood, addSmartPlaylist]);

  // ── Shuffle ───────────────────────────────────────────────────────────────────

  const handleShuffle = useCallback(() => {
    setGeneratedTracks((prev) => shuffleIntelligent([...prev]));
    toast('Shuffled!', { icon: '🔀' });
  }, []);

  // ── Play saved playlist ───────────────────────────────────────────────────────

  const handlePlaySaved = useCallback((pl: SmartPlaylist) => {
    if (!pl.tracks.length) return;
    setTrack(pl.tracks[0], pl.tracks, 0);
    toast.success(`Playing "${pl.name}"`, { icon: MOODS[pl.mood].emoji });
  }, [setTrack]);

  // ── Play single track ─────────────────────────────────────────────────────────

  const handlePlayTrack = useCallback((track: PlayerTrack) => {
    const idx = generatedTracks.findIndex((t) => t.id === track.id);
    setTrack(track, generatedTracks.length ? generatedTracks : [track], idx >= 0 ? idx : 0);
  }, [generatedTracks, setTrack]);

  const handleAddToQueue = useCallback((track: PlayerTrack) => {
    const current = playerQueue.length ? playerQueue : [];
    if (!current.find((t) => t.id === track.id)) {
      useStore.setState({ queue: [...current, track] });
      toast.success('Added to queue', { icon: '➕' });
    }
  }, [playerQueue]);

  // ── Discover similar ──────────────────────────────────────────────────────────

  const handleDiscover = useCallback(() => {
    if (!currentTrack) { toast.error('Play a song first!'); return; }
    const similar = findSimilar(currentTrack, history, 12);
    setSimilarTracks(similar);
    setShowDiscover(true);
    if (!similar.length) toast('No similar songs found in library', { icon: '🔍' });
  }, [currentTrack, history]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #7c3aed, #06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={20} color="white" />
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>AI Playlists</h2>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Smart playlists generated from your {playableHistory.length} downloaded songs
          </p>
        </div>
        {/* Discover Similar */}
        {currentTrack && (
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleDiscover}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.08)', color: '#38bdf8', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            <BookOpen size={15} />
            Discover Similar
          </motion.button>
        )}
      </div>

      {/* Empty state */}
      {playableHistory.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '48px 24px', borderRadius: 20, background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Music2 size={40} style={{ color: 'var(--text-muted)', margin: '0 auto 16px' }} />
          <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>No songs in your library</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Download songs using the Song Downloader or Playlist Downloader,<br />
            then come back here to generate AI playlists.
          </p>
        </motion.div>
      )}

      {playableHistory.length > 0 && (
        <>
          {/* Mood selector */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Select Mood</p>
              <button onClick={() => setSelectedMood(getTimeOfDayMood())}
                style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-light)', fontSize: 12, fontWeight: 600 }}
              >
                <Clock size={13} /> Auto (time of day)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {(Object.keys(MOODS) as MoodType[]).map((mood) => (
                <MoodCard key={mood} mood={mood} selected={selectedMood === mood} onSelect={() => setSelectedMood(mood)} />
              ))}
            </div>
          </div>

          {/* Settings row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Playlist length</span>
              <input type="range" min={5} max={Math.min(30, playableHistory.length)} step={1} value={trackCount}
                onChange={(e) => setTrackCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--accent)' }}
              />
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-light)', minWidth: 26 }}>{trackCount}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{playableHistory.length} songs available</span>
          </div>

          {/* Generate button */}
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '16px', borderRadius: 16, border: 'none',
              background: isGenerating ? 'rgba(124,58,237,0.4)' : 'var(--gradient-1)',
              color: 'white', cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontSize: 15, fontWeight: 700,
              boxShadow: isGenerating ? 'none' : '0 4px 24px rgba(124,58,237,0.4)',
            }}
          >
            {isGenerating ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Wand2 size={18} />
                </motion.div>
                Generating {MOODS[selectedMood].emoji}…
              </>
            ) : (
              <>
                <Wand2 size={18} />
                Generate {MOODS[selectedMood].emoji} {MOODS[selectedMood].label} Playlist
              </>
            )}
          </motion.button>

          {/* Generated results */}
          <AnimatePresence>
            {hasGenerated && generatedTracks.length > 0 && (
              <motion.div key="results" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {/* Results header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Generated Playlist</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                      {MOODS[selectedMood].emoji} {generatedTracks.length} {MOODS[selectedMood].label} tracks
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleShuffle}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-glass)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      <Shuffle size={13} /> Shuffle
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                    >
                      <Save size={13} /> Save
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={handlePlayAll}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 10, border: 'none', background: 'var(--gradient-1)', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                    >
                      <Play size={13} fill="white" /> Play All
                    </motion.button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {generatedTracks.map((track, i) => (
                    <RecommendationCard
                      key={track.id + i}
                      track={track}
                      mood={selectedMood}
                      index={i}
                      onPlay={handlePlayTrack}
                      onAddToQueue={handleAddToQueue}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discover Similar results */}
          <AnimatePresence>
            {showDiscover && similarTracks.length > 0 && (
              <motion.div key="discover" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                    Similar to "{currentTrack?.title?.slice(0, 30)}"
                  </p>
                  <button onClick={() => setShowDiscover(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}>Hide</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {similarTracks.map((track, i) => (
                    <RecommendationCard
                      key={track.id + i}
                      track={track}
                      mood={selectedMood}
                      index={i}
                      onPlay={handlePlayTrack}
                      onAddToQueue={handleAddToQueue}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {/* Saved playlists */}
      {smartPlaylists.length > 0 && (
        <div>
          <button
            onClick={() => setShowSaved((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12, padding: 0 }}
          >
            {showSaved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Saved Playlists ({smartPlaylists.length})
          </button>
          <AnimatePresence>
            {showSaved && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {smartPlaylists.map((pl) => (
                    <SavedPlaylistCard key={pl.id} playlist={pl} onPlay={handlePlaySaved} onDelete={removeSmartPlaylist} />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
