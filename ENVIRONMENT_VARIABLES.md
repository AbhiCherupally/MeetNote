# 🔧 MeetNote Environment Variables Configuration

## ✅ Your Python Backend: `https://meetnote-backend.onrender.com/`

**Status**: ✅ **WORKING PERFECTLY!** 

---

## 🔑 Environment Variables for Render Backend

Set these in your **Render Dashboard** → **MeetNote Backend Service** → **Environment**:

### 🚨 Required Variables

```env
# Core Configuration
ENVIRONMENT=production
PORT=10000

# AssemblyAI Integration (for real transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
```

### 🔧 Optional Variables (for enhanced features)

```env
# JWT Configuration (for secure authentication)
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database (if you want to add persistent storage later)
DATABASE_URL=postgresql://user:password@hostname:port/database

# Redis (for caching and session management)
REDIS_URL=redis://hostname:port

# OpenAI Integration (for AI summarization)
OPENAI_API_KEY=your_openai_api_key_here

# Logging Level
LOG_LEVEL=info
```

---

## 🌐 Environment Variables for Netlify Frontend

Set these in your **Netlify Dashboard** → **Site Settings** → **Environment Variables**:

```env
# Backend API Configuration
NEXT_PUBLIC_API_URL=https://meetnote-backend.onrender.com
NEXT_PUBLIC_WS_URL=wss://meetnote-backend.onrender.com

# Build Configuration
NODE_ENV=production
NEXT_PUBLIC_ENV=production

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your_google_analytics_id
```

---

## 📱 Chrome Extension Environment

**Already configured!** Extension now points to:
- **API**: `https://meetnote-backend.onrender.com`
- **WebSocket**: `wss://meetnote-backend.onrender.com/ws`

---

## 🎯 Priority Setup Order

### 1. **CRITICAL - Set on Render Backend immediately:**
```env
ENVIRONMENT=production
PORT=10000
ASSEMBLYAI_API_KEY=get_from_assemblyai_dashboard
```

### 2. **IMPORTANT - Set on Netlify Frontend:**
```env
NEXT_PUBLIC_API_URL=https://meetnote-backend.onrender.com
NODE_ENV=production
```

### 3. **OPTIONAL - Add later for enhanced features:**
- JWT secret for secure authentication
- OpenAI key for AI summarization
- Database URL for persistent storage

---

## 🧪 Test Your Configuration

### Backend Health Check:
```bash
curl https://meetnote-backend.onrender.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-09-27T...",
  "services": {
    "api": "running",
    "websocket": "running",
    "assemblyai": "configured"  // Will show "configured" after adding API key
  }
}
```

### Frontend Test:
1. Deploy to Netlify with environment variables
2. Visit your Netlify URL
3. Should connect to backend automatically

### Chrome Extension Test:
1. Load extension in Chrome
2. Join a Zoom/Meet/Teams meeting
3. Click "Start Recording"
4. Should connect to your backend

---

## 🔐 How to Get API Keys

### AssemblyAI (for transcription):
1. Go to: https://www.assemblyai.com/
2. Sign up for free account
3. Get API key from dashboard
4. **Free tier**: 5 hours/month transcription

### OpenAI (for AI features - optional):
1. Go to: https://platform.openai.com/
2. Create account and add payment method
3. Generate API key
4. **Cost**: ~$0.002 per 1K tokens

---

## 🚀 **Start with just these 3 variables:**

```env
ENVIRONMENT=production
PORT=10000
ASSEMBLYAI_API_KEY=your_key_from_assemblyai_dashboard
```

**Your backend is already working perfectly - just add AssemblyAI key for real transcription!** 🎯

---

**Status: ✅ Ready for production deployment!**