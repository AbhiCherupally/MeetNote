# Docker Quick Reference

## One-Command Start
```bash
./start-docker.sh
```

## Manual Commands

### Start Services
```bash
docker-compose up -d
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
# All services
docker-compose logs -f

# Backend only
docker-compose logs -f backend
```

### Rebuild After Changes
```bash
docker-compose up -d --build
```

### Check Status
```bash
docker-compose ps
```

### Enter Container Shell
```bash
docker-compose exec backend bash
```

### Restart Services
```bash
docker-compose restart
```

## Troubleshooting

### Check if backend is healthy
```bash
curl http://localhost:8000/health
```

### View API documentation
```bash
open http://localhost:8000/docs
```

### Clean Everything
```bash
# Stop and remove containers
docker-compose down

# Remove volumes too
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.docker .env
   ```

2. **Edit .env and add:**
   - `OPENROUTER_API_KEY=your_key_here`

3. **Add Google credentials:**
   ```bash
   cp /path/to/google-key.json credentials/google-credentials.json
   ```

## Chrome Extension Setup

Update `chrome-extension/background.js`:
```javascript
const API_URL = 'http://localhost:8000/api';
```

Load extension in Chrome:
1. Go to `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked"
4. Select `chrome-extension` folder
