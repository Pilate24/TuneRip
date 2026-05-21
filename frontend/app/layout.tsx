import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import ThemeProvider from '@/components/ThemeProvider';
import MusicPlayer from '@/components/MusicPlayer';

export const metadata: Metadata = {
  title: 'TuneRip – YouTube Music Downloader',
  description:
    'Download YouTube songs and playlists as high-quality MP3 files. Free, fast, and easy to use.',
  keywords: 'youtube downloader, mp3 downloader, music downloader, playlist downloader, youtube to mp3',
  authors: [{ name: 'TuneRip' }],
  robots: 'index, follow',
  openGraph: {
    title: 'TuneRip – YouTube Music Downloader',
    description: 'Download YouTube songs and playlists as high-quality MP3 files.',
    type: 'website',
    siteName: 'TuneRip',
  },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#7c3aed',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <div className="noise-overlay" style={{ minHeight: '100vh', position: 'relative' }}>
            <Navbar />
            <main style={{ paddingTop: '70px' }}>{children}</main>
          </div>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#16161f',
                color: '#f0f0ff',
                border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <MusicPlayer />
        </ThemeProvider>
      </body>
    </html>
  );
}
