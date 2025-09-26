# 🔧 Environment Variables Setup Guide

## **🖥️ Backend Environment Variables (Render)**

### **Required for Render Deployment:**

```bash
# === CORE CONFIGURATION ===
NODE_ENV=production
PORT=10000

# === SECURITY ===
JWT_SECRET=your-super-secure-jwt-secret-key-change-this
JWT_EXPIRES_IN=7d

# === DATABASE (Render PostgreSQL) ===
DATABASE_URL=postgresql://username:password@hostname:5432/database
# Get this from your Render PostgreSQL dashboard

# === CACHE (Render Key Value Store) ===
REDIS_URL=redis://redis-hostname:6379
# Get this from your Render Key Value Store dashboard

# === AI SERVICES ===
OPENROUTER_API_KEY=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
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=mistralai/mistral-7b-instruct:free
ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b

# === CORS ===
CORS_ORIGIN=https://meetnoteapp.netlify.app

# === RATE LIMITING ===
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# === OAUTH (Optional) ===
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# === WEBHOOKS (Optional) ===
WEBHOOK_SECRET=your-webhook-secret-key
```

---

## **🌐 Frontend Environment Variables (Netlify)**

### **Netlify Environment Variables:**

```bash
# === API CONFIGURATION ===
NEXT_PUBLIC_API_URL=https://meetnote.onrender.com

# === BUILD CONFIGURATION ===
NODE_ENV=production
```

### **Already Configured in netlify.toml:**
```toml
[build.environment]
  NEXT_PUBLIC_API_URL = "https://meetnote.onrender.com"
```

---

## **🚀 How to Set Environment Variables:**

### **For Render (Backend):**
1. Go to your Render service dashboard
2. Click on **"Environment"** tab
3. Add each variable above
4. Click **"Save Changes"**
5. Service will auto-deploy

### **For Netlify (Frontend):**
1. Go to your Netlify site dashboard  
2. Click **"Site settings"** → **"Environment variables"**
3. Add the environment variables above
4. Redeploy your site

---

## **🔧 Local Development:**

### **Backend (.env file):**
```bash
NODE_ENV=development
PORT=3001
JWT_SECRET=local-dev-secret-key
DATABASE_URL=postgresql://localhost:5432/meetnote_dev
REDIS_URL=redis://localhost:6379
OPENROUTER_API_KEY=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
ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b
CORS_ORIGIN=http://localhost:3000
```

### **Frontend (.env.local file):**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## **✅ Current Status:**

- ✅ **Backend CORS**: Fixed to include `https://meetnoteapp.netlify.app`
- ✅ **Frontend API URL**: Correctly pointing to `https://meetnote.onrender.com`
- ✅ **Chrome Extension**: Correctly pointing to `https://meetnote.onrender.com`
- ✅ **AI API Keys**: Already configured and working

## **🎯 Next Steps:**

1. **Update Render Environment Variables** with the backend config above
2. **Redeploy Backend** (Render will auto-deploy when you save env vars)
3. **Test CORS** by visiting your Netlify frontend and checking network requests
4. **Verify Extension** can communicate with both backend and frontend

The CORS issue should be resolved once you update the Render environment variables! 🚀