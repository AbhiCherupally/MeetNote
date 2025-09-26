# MeetNote - Render Deployment

## Free Tier Services Used:
- **Web Service**: Free (750 hours/month, spins down after 15 min idle)
- **Postgres**: Free (1GB storage, 30-day limit)  
- **Key Value Store**: Free (ephemeral, replaces Redis)
- **Static Site**: Netlify (free)

## Environment Variables for Render:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://username:password@hostname:5432/database
REDIS_URL=redis://redis-hostname:6379
JWT_SECRET=your-super-secret-jwt-key-change-this
OPENROUTER_API_KEY=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
ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b
CORS_ORIGIN=https://your-netlify-app.netlify.app
```

## Deployment Steps:

### 1. Prepare GitHub Repository
```bash
# Initialize git and push to GitHub
cd /Users/abhi/Documents/Projects/MeetNote
git init
git add .
git commit -m "Initial MeetNote deployment"
git branch -M main
git remote add origin https://github.com/yourusername/meetnote.git
git push -u origin main
```

### 2. Create Render Postgres Database
1. Go to [Render Dashboard](https://dashboard.render.com) → **New** → **PostgreSQL**
2. Choose **Free** instance type
3. Database Name: `meetnote`
4. User: `meetnote` 
5. Note the **Internal Database URL** (starts with `postgresql://`)

### 3. Create Render Key Value Store  
1. Go to Render Dashboard → **New** → **Key Value**
2. Choose **Free** instance type
3. Name: `meetnote-cache`
4. Note the **Redis URL** (starts with `redis://`)

### 4. Deploy Backend Web Service
1. Go to Render Dashboard → **New** → **Web Service**
2. Connect your GitHub repository
3. **Root Directory**: `backend`
4. **Runtime**: `Node`
5. **Build Command**: `npm install`
6. **Start Command**: `node src/app.js`
7. Choose **Free** instance type
8. **Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   DATABASE_URL=<your-postgres-url-from-step-2>
   REDIS_URL=<your-redis-url-from-step-3>
   JWT_SECRET=your-super-secret-jwt-key-change-this
   OPENROUTER_API_KEY=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
   ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b
   CORS_ORIGIN=https://your-netlify-app.netlify.app
   ```
9. Click **Deploy**
10. Note your service URL: `https://your-service-name.onrender.com`

### 5. Deploy Frontend to Netlify
1. Go to [Netlify](https://netlify.com) → **Add new site** → **Import from Git**
2. Connect your GitHub repository
3. **Base directory**: `frontend`
4. **Build command**: `npm run build`
5. **Publish directory**: `out`
6. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-service-name.onrender.com
   ```
7. Click **Deploy**
8. Note your site URL: `https://your-app-name.netlify.app`

### 6. Update Chrome Extension
1. Update `chrome-extension/background.js`:
   ```javascript
   this.apiUrl = 'https://your-service-name.onrender.com';
   ```
2. Update `chrome-extension/manifest.json` host_permissions:
   ```json
   "https://your-service-name.onrender.com/*"
   ```

### 7. Test Deployment
1. **Backend Health**: Visit `https://your-service-name.onrender.com/health`
2. **Frontend**: Visit `https://your-app-name.netlify.app`  
3. **Extension**: Load updated extension in Chrome
4. **API Integration**: Test login/signup from extension