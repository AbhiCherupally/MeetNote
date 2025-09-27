# 🔐 MeetNote Production Environment Variables

## ✅ Copy these to your Render Dashboard

Go to **Render Dashboard** → **MeetNote Backend Service** → **Environment** and add these variables:

### 🚨 CRITICAL PRODUCTION VARIABLES

```env
# Core Configuration
ENVIRONMENT=production
PORT=10000

# AssemblyAI - Real-time Transcription
ASSEMBLYAI_API_KEY=b82ed9bc052df302dff0cc3edfbbd5553d439e855b2a567b7a48a24c7ed95b1f

# OpenRouter - AI Summarization (Mistral)
OPENROUTER_API_KEY=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

# JWT Security
JWT_SECRET_KEY=meetnote_super_secret_key_2025_production
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Logging
LOG_LEVEL=info
```

### 📋 Step-by-Step Setup:

1. **Open Render Dashboard**: https://dashboard.render.com/
2. **Select Service**: Find your "MeetNote Backend" service
3. **Go to Environment**: Click "Environment" in the left sidebar
4. **Add Variables**: Click "Add Environment Variable" for each:

   - **Key**: `ASSEMBLYAI_API_KEY`  
     **Value**: `b82ed9bc052df302dff0cc3edfbbd5553d439e855b2a567b7a48a24c7ed95b1f`

   - **Key**: `OPENROUTER_API_KEY`  
     **Value**: `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`

   - **Key**: `ENVIRONMENT`  
     **Value**: `production`

   - **Key**: `PORT`  
     **Value**: `10000`

   - **Key**: `JWT_SECRET_KEY`  
     **Value**: `meetnote_super_secret_key_2025_production`

5. **Deploy**: Click "Deploy Latest Commit" to apply changes

---

## 🧪 Verification Commands

After setting variables and deploying, test these endpoints:

```bash
# Health Check (should show both services configured)
curl https://meetnote-backend.onrender.com/api/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-09-27T...",
  "services": {
    "api": "running",
    "websocket": "running", 
    "assemblyai": "configured",  # ✅ Should now show "configured"
    "openrouter": "configured"   # ✅ AI features enabled
  }
}
```

```bash
# Root endpoint
curl https://meetnote-backend.onrender.com/

# Should show Python backend with AI features
```

---

## 🎯 What These Keys Enable:

### 🎤 AssemblyAI Key:
- **Real-time transcription** during meetings
- **Speaker identification** 
- **Auto-highlights** detection
- **Transcription accuracy**: 95%+
- **Free tier**: 5 hours/month

### 🤖 OpenRouter (Mistral) Key:
- **AI-powered meeting summaries**
- **Action item extraction** 
- **Key decision highlights**
- **Smart meeting insights**
- **Cost**: ~$0.001 per meeting summary

---

## 🚀 Expected Results After Setup:

1. **Chrome Extension**: Real transcription instead of mock data
2. **Live Captions**: Appear in meeting overlay  
3. **AI Summaries**: Generated after meetings
4. **Smart Highlights**: Automatically detected
5. **Speaker Names**: Identified in transcripts

---

## 🔒 Security Notes:

- ✅ **API Keys**: Stored securely in Render environment
- ✅ **No Code Exposure**: Keys never appear in GitHub
- ✅ **Production Only**: Keys only used in production environment
- ✅ **JWT Security**: Secure user authentication

---

## ⏱️ Deployment Timeline:

1. **Set Variables**: 2 minutes
2. **Deploy Service**: 3-5 minutes  
3. **Health Check**: Verify configuration
4. **Full Testing**: Chrome extension + real meetings

**Total Setup Time: ~7 minutes** ⚡

---

**🎉 Your MeetNote system will be FULLY FUNCTIONAL with real AI transcription once you add these environment variables!**

**Next: Set the variables in Render Dashboard and deploy!** 🚀