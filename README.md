# MeetNote - AI Meeting Assistant

> Record, transcribe, and get AI summaries of your meetings. Works invisibly with Zoom, Google Meet, and Microsoft Teams.

[![Deploy Status](https://img.shields.io/badge/deploy-netlify-00C7B7?logo=netlify)](https://meetnoteapp.netlify.app)
[![Backend](https://img.shields.io/badge/backend-render-46E3B7?logo=render)](https://meetnote-backend.onrender.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## 🌟 Features

- **🎙️ Invisible Recording** - Works in background without interfering with meetings
- **📝 Real-time Transcription** - Whisper AI for accurate, free transcription
- **🤖 AI Summarization** - OpenRouter's Mistral 7B for intelligent summaries
- **⭐ Quick Highlights** - Mark important moments with keyboard shortcuts
- **⌨️ Keyboard Control** - Alt+R to record, Alt+H for highlights
- **🔐 Secure & Private** - Your data stays on your backend
- **100% FREE** - All components use free tiers

---

## 🏗️ Architecture

```
┌──────────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│ Chrome Extension │─────►│   FastAPI Backend   │─────►│  Next.js Frontend │
│  (Invisible)     │◄─────│ (Whisper + Mistral) │      │   (Dashboard)     │
└──────────────────┘      └─────────────────────┘      └──────────────────┘
```

### Tech Stack

**Backend** (`/backend`)
- FastAPI (Python)
- faster-whisper for transcription (FREE)
- OpenRouter Mistral 7B for AI (FREE)
- PostgreSQL database
- Docker ready

**Frontend** (`/frontend`)
- Next.js 15 with React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- 50+ custom components

**Extension** (`/chrome-extension`)
- Manifest V3
- Invisible content script
- Real-time audio capture
- JWT authentication

---

## 🚀 Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/meetnote.git
cd meetnote
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your configuration

# Run server
python -m app.main
```

Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
bun install  # or npm install

# Create .env.local
cp .env.local.example .env.local

# Run dev server
bun dev  # or npm run dev
```

Frontend runs at `http://localhost:3000`

### 4. Chrome Extension Setup

```bash
# Load extension
1. Open Chrome -> chrome://extensions/
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select chrome-extension folder
```

---

## 📦 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.

### Quick Deploy

**Backend (Render):**
```bash
cd backend
# Push to GitHub, connect to Render
# Set env vars and deploy
```

**Frontend (Netlify):**
```bash
cd frontend
# Push to GitHub, connect to Netlify
# Auto-deploys on push
```

**Live URLs:**
- Frontend: `https://meetnoteapp.netlify.app`
- Backend: `https://meetnote-backend.onrender.com`

---

## 🎯 Usage

### Via Chrome Extension

1. Install extension
2. Join meeting (Zoom/Google Meet/Teams)
3. Click extension icon → Login
4. Press `Alt+R` to start recording
5. Press `Alt+H` to create highlights
6. Press `Alt+T` to toggle transcript overlay
7. View recordings in dashboard

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+R` | Start/Stop Recording |
| `Alt+H` | Create Highlight |
| `Alt+T` | Toggle Transcript Overlay |

---

## 🗂️ Project Structure

```
meetnote/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app
│   │   ├── api/            # API routes
│   │   ├── core/           # Config, security
│   │   ├── db/             # Database models
│   │   └── services/       # Whisper, AI services
│   ├── Dockerfile
│   ├── requirements.txt
│   └── README.md
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # App router pages
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities, API client
│   ├── public/
│   ├── package.json
│   └── README.md
│
├── chrome-extension/       # Chrome extension
│   ├── manifest.json      # Extension manifest
│   ├── background.js      # Service worker
│   ├── content.js         # Content script
│   ├── popup.html         # Extension popup
│   ├── popup.js           # Popup logic
│   └── README.md
│
└── DEPLOYMENT.md          # Deployment guide
```

---

## 🔧 Configuration

### Backend Environment Variables

```env
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
OPENROUTER_API_KEY=your-api-key
WHISPER_MODEL=base
WHISPER_DEVICE=cpu
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=https://meetnote-backend.onrender.com
```

---

## 🧪 API Documentation

Once backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Main Endpoints

```
POST /api/auth/register        - Register user
POST /api/auth/login           - Login user
POST /api/meetings             - Create meeting
GET  /api/meetings             - List meetings
POST /api/meetings/{id}/upload-audio  - Upload audio
POST /api/meetings/{id}/highlights    - Create highlight
WS   /ws/{client_id}           - Real-time transcription
```

---

## 💰 Cost (All FREE!)

| Component | Service | Cost |
|-----------|---------|------|
| Transcription | Whisper AI (local) | **$0** |
| AI Summaries | OpenRouter Mistral 7B | **$0** |
| Database | Render PostgreSQL | **$0** (90 days) |
| Backend | Render Web Service | **$0** (750hrs/mo) |
| Frontend | Netlify | **$0** (100GB/mo) |
| Extension | Chrome Web Store | **$5** (one-time) |

**Total: $0/month** 🎉

---

## 🛠️ Development

### Run Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
bun test
```

### Docker

```bash
# Build and run backend
cd backend
docker build -t meetnote-backend .
docker run -p 8000:8000 --env-file .env meetnote-backend
```

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [faster-whisper](https://github.com/guillaumekln/faster-whisper) - Optimized inference
- [OpenRouter](https://openrouter.ai/) - LLM API gateway
- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python framework
- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/meetnote/issues)
- **Email**: support@meetnoteapp.com
- **Website**: [meetnoteapp.netlify.app](https://meetnoteapp.netlify.app)

---

## 🗺️ Roadmap

- [ ] Speaker diarization
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Slack/Teams integration
- [ ] Calendar integration
- [ ] Video highlights
- [ ] Team collaboration features

---

Made with ❤️ by the MeetNote team
