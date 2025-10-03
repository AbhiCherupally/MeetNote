# 🎙️ MeetNote - AI Meeting Assistant

AI-powered meeting recording, transcription, and summarization Chrome extension with Python backend.

## ✨ Features

- 🎤 **Audio Recording** - Record meetings directly from your browser
- 📝 **AI Transcription** - Powered by Google Gemini API
- 🤖 **Smart Summaries** - AI-generated summaries using Mistral 7B
- ✅ **Action Items** - Automatic extraction of action items
- 💾 **Meeting Storage** - Save and retrieve past meetings
- 🌐 **Chrome Extension** - Works with Zoom, Google Meet, Teams, etc.

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd MeetNote

# 2. Get API keys (both free!)
# - Google Gemini: https://aistudio.google.com/app/apikey
# - OpenRouter: https://openrouter.ai

# 3. Configure environment
cp .env.docker .env
# Edit .env with your API keys

# 4. Start with Docker
./start-docker.sh
```

### Option 2: Local Development

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Configure API keys
cp .env.example .env
# Edit .env with your keys

# 3. Start backend
uvicorn main:app --reload --port 8000
```

## 🔧 Setup Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Pin the extension to your toolbar

## 📚 Documentation

- [Quick Start Guide](QUICK_START.md) - Get up and running
- [Docker Guide](DOCKER_GUIDE.md) - Docker setup and deployment
- [Docker Commands](DOCKER_COMMANDS.md) - Quick reference

## 🏗️ Architecture

```
MeetNote/
├── backend/              # Python FastAPI backend
│   ├── main.py          # FastAPI application
│   ├── models/          # Data models
│   ├── routes/          # API endpoints
│   └── services/        # Business logic
│       ├── stt.py       # Google Gemini transcription
│       ├── summarization.py  # Mistral 7B summaries
│       └── storage.py   # In-memory storage
├── chrome-extension/    # Chrome extension
│   ├── manifest.json
│   ├── popup.html       # Extension UI
│   ├── popup.js         # UI logic
│   └── background.js    # API communication
└── docker-compose.yml   # Docker configuration
```

## 🔑 API Keys

### Google Gemini API (Free)
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy and add to `.env` as `GOOGLE_GEMINI_API_KEY`

### OpenRouter API (Free tier)
1. Visit https://openrouter.ai
2. Sign up and get API key
3. Copy and add to `.env` as `OPENROUTER_API_KEY`

## 📡 API Endpoints

- `GET /` - Health check
- `GET /health` - Health status
- `POST /api/meetings/transcribe` - Transcribe audio
- `POST /api/meetings/create` - Save meeting with summary
- `GET /api/meetings/` - List all meetings
- `GET /api/meetings/{id}` - Get specific meeting
- `DELETE /api/meetings/{id}` - Delete meeting

## 🛠️ Tech Stack

**Backend:**
- FastAPI (Python web framework)
- Google Gemini API (Audio transcription)
- OpenRouter + Mistral 7B (AI summarization)
- Uvicorn (ASGI server)

**Frontend:**
- Chrome Extension (Manifest V3)
- Vanilla JavaScript
- Chrome APIs

**DevOps:**
- Docker & Docker Compose
- Python 3.11

## 📝 Usage

1. **Start Recording:**
   - Click the MeetNote extension icon
   - Click "Start Recording"
   - Speak or join a meeting

2. **Stop & Save:**
   - Click "Stop Recording"
   - Enter a meeting title
   - Wait for AI processing

3. **View Results:**
   - See transcript with speaker labels
   - Read AI-generated summary
   - Review action items

## 🔒 Privacy & Security

- All processing happens on your server
- No data stored in third-party services
- API keys stored securely in environment variables
- In-memory storage (no persistent DB by default)

## 🚢 Deployment

### Docker Deployment
```bash
docker-compose up -d
```

### Cloud Deployment
- Railway: Push with `railway up`
- Fly.io: Deploy with `fly deploy`
- Render: Connect GitHub repo

See [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for details.

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project however you'd like!

## 🆘 Support

- Check [QUICK_START.md](QUICK_START.md) for setup help
- Review [DOCKER_GUIDE.md](DOCKER_GUIDE.md) for Docker issues
- Open an issue for bugs or questions

## 🗺️ Roadmap

- [ ] PostgreSQL integration for persistent storage
- [ ] Real-time transcription with WebSockets
- [ ] Multi-language support
- [ ] Export to PDF/Word
- [ ] Calendar integration
- [ ] Team collaboration features

---

Made with ❤️ by [Your Name]
