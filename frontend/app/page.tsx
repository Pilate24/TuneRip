'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Music2,
  Download,
  List,
  Search,
  Zap,
  Shield,
  Headphones,
  ArrowRight,
  Star,
  CheckCircle,
} from 'lucide-react';
import DownloadQueue from '@/components/DownloadQueue';

const features = [
  { icon: Music2, title: 'HD Audio Quality', desc: 'Download at 128, 192, or 320kbps for crisp, clear audio.', color: '#7c3aed' },
  { icon: List, title: 'Playlist Download', desc: 'Grab entire playlists as a ZIP file with one click.', color: '#ec4899' },
  { icon: Zap, title: 'Lightning Fast', desc: 'Optimized pipeline for the fastest possible downloads.', color: '#f59e0b' },
  { icon: Search, title: 'YouTube Search', desc: 'Search and find songs directly without leaving the app.', color: '#06b6d4' },
  { icon: Shield, title: 'Safe & Secure', desc: 'Files are processed server-side and deleted after download.', color: '#10b981' },
  { icon: Headphones, title: 'MP3 Format', desc: 'Universal MP3 format works on every device and player.', color: '#8b5cf6' },
];

const steps = [
  { num: '01', title: 'Paste the Link', desc: 'Copy any YouTube video or playlist URL and paste it into TuneRip.' },
  { num: '02', title: 'Choose Quality', desc: 'Select your preferred audio quality: 128, 192, or 320kbps.' },
  { num: '03', title: 'Download MP3', desc: 'Click download and get your MP3 file in seconds.' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <DownloadQueue />

      {/* Hero */}
      <section
        style={{
          minHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px 24px 60px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background orbs */}
        <div style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '20%',
          right: '10%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          style={{ textAlign: 'center', maxWidth: 720, position: 'relative', zIndex: 1 }}
        >
          {/* Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 16px',
              borderRadius: '20px',
              background: 'rgba(124,58,237,0.1)',
              border: '1px solid rgba(124,58,237,0.3)',
              marginBottom: '28px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--accent-light)',
            }}
          >
            <Star size={13} fill="currentColor" />
            Free YouTube MP3 Downloader
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              fontSize: 'clamp(42px, 8vw, 76px)',
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: '24px',
            }}
          >
            Download Music{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Instantly
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: '18px',
              lineHeight: 1.7,
              color: 'var(--text-secondary)',
              marginBottom: '40px',
              maxWidth: 520,
              margin: '0 auto 40px',
            }}
          >
            Convert YouTube videos to high-quality MP3. Single songs or entire playlists — no limits, no ads.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
          >
            <Link href="/downloader">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-primary"
                style={{ fontSize: '16px', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Download size={18} /> Download Song
              </motion.button>
            </Link>
            <Link href="/playlist">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="btn-ghost"
                style={{ fontSize: '16px', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <List size={18} /> Download Playlist
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            style={{
              display: 'flex',
              gap: '40px',
              justifyContent: 'center',
              marginTop: '60px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { val: '320kbps', label: 'Max Quality' },
              { val: 'Free', label: 'Always Free' },
              { val: 'Fast', label: 'Processing' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.val}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: '12px' }}>
            Everything You Need
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Powerful features packed into a clean, beautiful interface.
          </p>
        </motion.div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '20px',
          }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              style={{
                padding: '28px',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: '14px',
                  background: `${f.color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <f.icon size={24} color={f.color} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, marginBottom: '12px' }}>
            How It Works
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
            Three simple steps to your music.
          </p>
        </motion.div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              style={{
                display: 'flex',
                gap: '24px',
                alignItems: 'flex-start',
                padding: '28px',
                borderRadius: '20px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  fontWeight: 900,
                  background: 'var(--gradient-1)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {step.num}
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>{step.title}</h3>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Legal Disclaimer */}
      <section style={{ padding: '40px 24px 80px', maxWidth: 900, margin: '0 auto' }}>
        <div
          style={{
            padding: '24px',
            borderRadius: '16px',
            background: 'rgba(245,158,11,0.05)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
        >
          <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={16} /> Legal Disclaimer
          </h4>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            TuneRip is intended for personal use only. Users must only download content they own or have explicit permission to download. Downloading copyrighted content without authorization may violate copyright law and YouTube&apos;s Terms of Service. We do not condone or encourage copyright infringement. Please ensure you have the right to download any content before using this service. The responsibility for complying with applicable laws lies solely with the user.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: 'linear-gradient(180deg, transparent, rgba(124,58,237,0.05))',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 800, marginBottom: '16px' }}>
            Ready to Start Downloading?
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
            Paste your first YouTube link and get your music in seconds.
          </p>
          <Link href="/downloader">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              className="btn-primary"
              style={{ fontSize: '16px', padding: '16px 40px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              Get Started <ArrowRight size={18} />
            </motion.button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
}
