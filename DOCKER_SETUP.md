# 🐳 MeetNote Docker Setup Guide

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- Chrome browser for extension testing

### 1. Start the Backend (Docker)

```bash
# Clone and navigate to project
cd /Users/abhi/Documents/Projects/MeetNote

# Start all services with Docker
./start-docker.sh start
```

This will:
- ✅ Build Python FastAPI backend container
- ✅ Start PostgreSQL database
- ✅ Start Redis (optional)
- ✅ Backend available at `http://localhost:8000`

### 2. Load Chrome Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. Extension should appear with MeetNote icon

### 3. Test the System

1. **Health Check**: Visit http://localhost:8000/api/health
2. **Join a meeting** (Zoom, Google Meet, Teams, etc.)
3. **Open extension popup** and try to start recording
4. **Check logs**: `./start-docker.sh logs`

---

## 🚀 Available Commands

```bash
./start-docker.sh start    # Start all services
./start-docker.sh stop     # Stop all services
./start-docker.sh logs     # Show real-time logs
./start-docker.sh restart  # Restart all services
./start-docker.sh cleanup  # Clean up Docker resources
```

---

## 🔧 Configuration

### Environment Variables (docker-compose.yml)

```yaml
ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b  # Real transcription
JWT_SECRET_KEY=dev_secret_key_12345                  # Authentication
DATABASE_URL=postgresql://postgres:password@db:5432/meetnote
```

### Services Running

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Backend API | 8000 | http://localhost:8000 | FastAPI server |
| Database | 5432 | localhost:5432 | PostgreSQL |
| Redis | 6379 | localhost:6379 | Sessions (optional) |

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check Docker status
docker info

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs backend
```

### Chrome Extension issues
1. Check extension is loaded: `chrome://extensions/`
2. Verify backend URL in `background.js`: `http://localhost:8000`
3. Check browser console for errors
4. Try refreshing the meeting page

### Database connection issues
```bash
# Restart database
docker-compose restart db

# Check database logs
docker-compose logs db
```

### Audio capture not working
1. Grant microphone permissions to Chrome
2. Test on Zoom/Meet (not generic websites)
3. Check browser console for audio errors
4. Verify Chrome extension has `tabCapture` permission

---

## 📊 Production Deployment (Render)

For production deployment to Render:

1. **Update render.yaml** (already configured)
2. **Set environment variables** in Render dashboard:
   ```
   ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b
   JWT_SECRET_KEY=your_production_secret_key
   DATABASE_URL=your_postgres_connection_string
   ```

3. **Deploy**: Push to GitHub, Render auto-deploys

4. **Update Chrome extension** for production:
   ```javascript
   // In background.js, switch to:
   this.apiUrl = 'https://your-render-app.onrender.com';
   this.wsUrl = 'wss://your-render-app.onrender.com/ws';
   ```

---

## 🎯 Expected Behavior

### ✅ Working Features:
- Backend health check at `/api/health`
- User authentication (mock/demo users)
- Meeting creation and management
- WebSocket connections for real-time data
- Chrome extension popup and controls
- Meeting platform detection (Zoom, Meet, Teams, Webex)

### 🚧 In Development:
- Real-time audio transcription (AssemblyAI integration)
- AI meeting summaries
- Production authentication system

### 🔄 Architecture Flow:
```
Chrome Extension → Audio Capture → WebSocket → Python Backend → AssemblyAI → Real-time Transcript
```

---

## 📁 Project Structure

```
MeetNote/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile          # Backend container
├── chrome-extension/
│   ├── manifest.json       # Extension config
│   ├── background.js       # Service worker
│   ├── popup.html/js       # Extension popup
│   └── content.js          # Injected scripts
├── frontend/               # Next.js dashboard
├── docker-compose.yml     # Local development
├── Dockerfile            # Production build
├── render.yaml          # Render deployment
└── start-docker.sh     # Quick start script
```

---

## 🔑 Test Credentials

For testing authentication:
- Email: `abhi@meetnote.app`
- Password: `admin123`

---

## 🆘 Need Help?

1. **Check logs**: `./start-docker.sh logs`
2. **Restart services**: `./start-docker.sh restart`
3. **Clean slate**: `./start-docker.sh cleanup` then `./start-docker.sh start`
4. **Health check**: http://localhost:8000/api/health should return `{"status": "healthy"}`

---

**✅ Docker setup is production-ready for Render deployment!**