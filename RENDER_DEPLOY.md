# Render Deployment Guide

## 🚀 Deploy to Render

### Quick Deploy (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Render deployment config"
   git push
   ```

2. **Connect to Render:**
   - Go to https://render.com
   - Click "New +" → "Blueprint"
   - Connect your GitHub repo
   - Render will auto-detect `render.yaml`
   - Click "Apply"

3. **Set Environment Variables:**
   In Render dashboard, add:
   - `GOOGLE_GEMINI_API_KEY`: AIzaSyBGI6JnuH4mapziVz9r8-4P7YI_AdnIWdo
   - `OPENROUTER_API_KEY`: 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

4. **Database is Auto-Connected:**
   - Your existing PostgreSQL database will be linked automatically
   - Connection string from environment variable

### Manual Deploy

If you prefer manual setup:

1. **Create Web Service:**
   - Go to Render Dashboard
   - Click "New +" → "Web Service"
   - Connect GitHub repo
   - Select `backend` as root directory

2. **Configure Build:**
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Python Version**: 3.11

3. **Environment Variables:**
   Add in Render dashboard:
   ```
   GOOGLE_GEMINI_API_KEY=AIzaSyBGI6JnuH4mapziVz9r8-4P7YI_AdnIWdo
   OPENROUTER_API_KEY=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
   DATABASE_URL=postgresql://meetnote_user:i6nKUcLw6nfG1dsdL2nHDRZsD287twma@dpg-d3bcgue3jp1c73aua850-a.oregon-postgres.render.com:5432/meetnote
   ```

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)

### 🔗 Your Deployment URLs

After deployment, you'll get:
- **Backend URL**: `https://meetnote-backend.onrender.com`
- **API Docs**: `https://meetnote-backend.onrender.com/docs`
- **Health Check**: `https://meetnote-backend.onrender.com/health`

### 📱 Update Chrome Extension

After deployment, update the API URL in Chrome extension:

**File**: `chrome-extension/background.js`
```javascript
// Change from:
const API_URL = 'http://localhost:8000/api';

// To your Render URL:
const API_URL = 'https://meetnote-backend.onrender.com/api';
```

Then reload the extension in Chrome.

### ✅ Test Deployment

```bash
# Check health
curl https://meetnote-backend.onrender.com/health

# Test API
curl https://meetnote-backend.onrender.com/

# View docs
open https://meetnote-backend.onrender.com/docs
```

### 🔄 Auto-Deploy

Render will automatically deploy when you push to GitHub:
```bash
git add .
git commit -m "Update backend"
git push
```

### 📊 Monitor

- **Logs**: Render Dashboard → Your Service → Logs
- **Metrics**: Render Dashboard → Your Service → Metrics
- **Events**: Render Dashboard → Your Service → Events

### ⚠️ Free Plan Notes

- **Cold Starts**: Service spins down after 15 minutes of inactivity
- **First Request**: May take 30-60 seconds to wake up
- **Database**: 90 days free, then $7/month
- **Upgrade**: $7/month for always-on service

### 🐛 Troubleshooting

**Build Fails:**
```bash
# Check requirements.txt
cat backend/requirements.txt

# Test locally first
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

**Database Connection Fails:**
- Verify DATABASE_URL in environment variables
- Check PostgreSQL is running in Render dashboard
- Ensure connection string format is correct

**API Not Responding:**
- Check Render logs for errors
- Verify PORT environment variable
- Check healthCheckPath is `/health`

### 🚀 Production Optimizations

**Add Workers:**
```yaml
startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT --workers 4
```

**Add Logging:**
```python
import logging
logging.basicConfig(level=logging.INFO)
```

**Add Health Metrics:**
```python
@app.get("/metrics")
async def metrics():
    return {"status": "ok", "timestamp": datetime.now()}
```

---

**Ready to deploy!** 🚀

Just push to GitHub and connect to Render, or use the manual setup guide above.
