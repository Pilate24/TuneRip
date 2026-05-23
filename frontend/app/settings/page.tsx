'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/lib/store';
import { Settings, Sun, Moon, Volume2, Trash2, Info, Shield, Palette, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import dynamic from 'next/dynamic';

const BackgroundCustomizer = dynamic(() => import('@/components/BackgroundCustomizer'), {
  ssr: false,
});

const QUALITIES = [
  { value: '128', label: '128 kbps', desc: 'Smaller file size, standard quality' },
  { value: '192', label: '192 kbps', desc: 'Balanced quality and size (recommended)' },
  { value: '320', label: '320 kbps', desc: 'Best quality, larger file size' },
];

const BACKGROUND_TYPE_LABELS: Record<string, string> = {
  solid: 'Solid Color',
  gradient: 'Gradient',
  image: 'Custom Image',
  video: 'Custom Video',
  animated: 'Animated',
};

export default function SettingsPage() {
  const { theme, toggleTheme, defaultQuality, setDefaultQuality, history, clearHistory, backgroundConfig } = useStore();
  const [showBgCustomizer, setShowBgCustomizer] = useState(false);

  const bgTypeLabel = BACKGROUND_TYPE_LABELS[backgroundConfig.type] ?? 'Custom';
  const bgDetail =
    backgroundConfig.type === 'animated' ? backgroundConfig.preset ?? '' :
    backgroundConfig.type === 'solid' ? backgroundConfig.solidColor ?? '' :
    '';

  return (
    <div style={{ minHeight: '100vh', padding: '40px 24px 80px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'var(--gradient-1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={22} color="white" />
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Settings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Customize your TuneRip experience</p>
        </motion.div>

        {/* Appearance */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Appearance
          </h2>
          <div style={{ borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Theme toggle */}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {theme === 'dark' ? <Moon size={20} style={{ color: 'var(--accent-light)' }} /> : <Sun size={20} style={{ color: '#f59e0b' }} />}
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>Theme</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Currently {theme === 'dark' ? 'dark' : 'light'} mode</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: theme === 'dark' ? 'rgba(245,158,11,0.1)' : 'rgba(124,58,237,0.1)',
                  border: theme === 'dark' ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(124,58,237,0.3)',
                  color: theme === 'dark' ? '#f59e0b' : 'var(--accent-light)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
                Switch to {theme === 'dark' ? 'Light' : 'Dark'}
              </motion.button>
            </div>

            {/* Background customization */}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Palette size={20} style={{ color: 'var(--accent-light)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 600 }}>Background</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {bgTypeLabel}{bgDetail ? ` · ${bgDetail}` : ''}
                    {(backgroundConfig.blur ?? 0) > 0 ? ` · blur ${backgroundConfig.blur}px` : ''}
                  </p>
                </div>
              </div>
              <motion.button
                id="open-bg-customizer"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowBgCustomizer(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: 'rgba(124,58,237,0.12)',
                  border: '1px solid rgba(124,58,237,0.3)',
                  color: 'var(--accent-light)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={15} />
                Customize
              </motion.button>
            </div>
          </div>
        </motion.section>

        {/* Audio Quality */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Default Audio Quality
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {QUALITIES.map((q) => (
              <div
                key={q.value}
                onClick={() => {
                  setDefaultQuality(q.value);
                  toast.success(`Default quality set to ${q.label}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: 'var(--bg-card)',
                  border: defaultQuality === q.value ? '1px solid var(--accent)' : '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: defaultQuality === q.value ? '0 0 0 2px var(--accent-glow)' : 'none',
                }}
              >
                <div style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: defaultQuality === q.value ? '2px solid var(--accent)' : '2px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {defaultQuality === q.value && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
                  )}
                </div>
                <Volume2 size={18} style={{ color: defaultQuality === q.value ? 'var(--accent-light)' : 'var(--text-muted)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '15px', fontWeight: 600, color: defaultQuality === q.value ? 'var(--accent-light)' : 'var(--text-primary)' }}>{q.label}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: 2 }}>{q.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Data */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Data &amp; Privacy
          </h2>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Download History</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {history.length} {history.length === 1 ? 'entry' : 'entries'} stored locally
                </p>
              </div>
              <button
                onClick={() => {
                  if (history.length === 0) return toast('History is already empty', { icon: 'ℹ️' });
                  clearHistory();
                  toast.success('Download history cleared');
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
                <Trash2 size={14} /> Clear History
              </button>
            </div>
          </div>
        </motion.section>

        {/* About */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            About
          </h2>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[
              { label: 'App Name', value: 'TuneRip' },
              { label: 'Version', value: '1.0.0' },
              { label: 'Technology', value: 'Next.js + Node.js + yt-dlp' },
              { label: 'License', value: 'Personal Use Only' },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Legal */}
        <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <Shield size={18} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
              <div>
                <p style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>Legal Disclaimer</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                  TuneRip is for personal use only. Only download content you own or have permission to download.
                  Downloading copyrighted content without authorization may violate copyright law and YouTube&apos;s
                  Terms of Service. Users are solely responsible for their compliance with applicable laws.
                </p>
              </div>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Background Customizer Modal */}
      <AnimatePresence>
        {showBgCustomizer && (
          <BackgroundCustomizer onClose={() => setShowBgCustomizer(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
