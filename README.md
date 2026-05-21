# 🎵 TuneRip — YouTube Music Downloader & Streamer

> A beautiful, full-stack web app to stream and download YouTube music as high-quality MP3.

![TuneRip](https://img.shields.io/badge/TuneRip-v2.0-7c3aed?style=for-the-badge&logo=music&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)

---

## ✨ Features

- 🎧 **Stream Online** — Play any YouTube video as audio directly in the browser, no download needed
- ⬇️ **Download MP3** — Convert YouTube videos to 128 / 192 / 320 kbps MP3
- 📋 **Playlist Download** — Grab entire playlists as individual MP3 files
- 🔍 **YouTube Search** — Search and play/download without leaving the app
- 🎵 **Built-in Music Player** — Full-featured player with queue, shuffle, repeat, mini-mode
- 📜 **History** — Browse and re-stream/re-download past songs
- 🌙 **Dark / Light Mode** — Smooth theme switching
- ⚡ **Real-time Progress** — WebSocket-powered download progress via Socket.io
- 🏎️ **Unlimited Downloads** — No rate limits or queue caps

---

## 🛠️ Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Framer Motion |
| Backend | Node.js, Express 5, Socket.io |
| Audio | yt-dlp, ffmpeg |
| State | Zustand (with persistence) |
| Styling | Vanilla CSS (dark glassmorphism) |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and in PATH (or set `YTDLP_PATH` in `.env`)
- [ffmpeg](https://ffmpeg.org/) installed (or set `FFMPEG_PATH` in `.env`)

### Installation

```bash
git clone https://github.com/Pilate24/TuneRip.git
cd TuneRip
npm install        # installs root + frontend + backend deps
```

### Configuration

Copy and edit the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env`:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
YTDLP_PATH=yt-dlp          # path to yt-dlp binary
FFMPEG_PATH=ffmpeg         # path to ffmpeg binary
TEMP_DIR=./temp
```

### Run in Development

```bash
npm run dev
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 📁 Project Structure

```
TuneRip/
├── frontend/               # Next.js app
│   ├── app/
│   │   ├── page.tsx        # Landing page
│   │   ├── downloader/     # Single song downloader
│   │   ├── playlist/       # Playlist downloader
│   │   ├── search/         # YouTube search + stream/download
│   │   ├── history/        # Download history
│   │   └── settings/       # App settings
│   ├── components/
│   │   ├── MusicPlayer.tsx # Full-featured audio player
│   │   ├── DownloadQueue.tsx
│   │   └── Navbar.tsx
│   └── lib/
│       ├── api.ts          # API helpers + streaming utils
│       └── store.ts        # Zustand global store
│
└── backend/                # Express API server
    └── src/
        ├── server.js       # Entry point + Socket.io
        ├── routes/api.js   # All REST endpoints
        └── utils/ytdlp.js  # yt-dlp wrapper (info, download, stream)
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/info?url=` | Get video / playlist metadata |
| POST | `/api/download` | Start an MP3 download job |
| GET | `/api/progress/:jobId` | Poll download progress |
| GET | `/api/file/:jobId` | Download completed MP3 file |
| DELETE | `/api/download/:jobId` | Cancel a download |
| POST | `/api/retry/:jobId` | Retry a failed download |
| POST | `/api/playlist-download` | Start playlist download jobs |
| GET | `/api/search?q=` | Search YouTube |
| GET | `/api/stream?url=` | **Stream audio** (proxy for browser playback) |
| GET | `/api/stream-url?url=` | Get raw direct audio URL |
| GET | `/api/health` | Health check |

---

## ⚖️ Legal Disclaimer

TuneRip is intended for **personal use only**. Only download content you own or have explicit permission to download. Downloading copyrighted material without authorization may violate copyright law and YouTube's Terms of Service. The responsibility for complying with applicable laws lies solely with the user.

---

## 📄 License

ISC © TuneRip
