# MeetNote Docker Setup Guide

Complete guide to run MeetNote backend using Docker.

## Prerequisites

- Docker installed ([Get Docker](https://docs.docker.com/get-docker/))
- Docker Compose installed (included with Docker Desktop)
- Google Gemini API key ([Get free key](https://aistudio.google.com/app/apikey))
- OpenRouter API key ([Get free key](https://openrouter.ai))

## Quick Start

### 1. Get API Keys

**Google Gemini API (Free):**
1. Visit https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

**OpenRouter API (Free tier available):**
1. Visit https://openrouter.ai
2. Sign up and get API key
3. Copy the key

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit .env and add your API keys:
# GOOGLE_GEMINI_API_KEY=your_key_here
# OPENROUTER_API_KEY=your_key_here
```

### 3. Start with Docker Compose

```bash
# Build and start the backend
docker-compose up -d

# View logs
docker-compose logs -f backend

# Check status
docker-compose ps
```

Backend will be available at: **http://localhost:8000**

### 4. Test the API

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## Docker Commands

### Basic Operations

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart services
docker-compose restart

# View logs
docker-compose logs -f
```

### Development

```bash
# Rebuild after code changes
docker-compose up -d --build

# Enter container shell
docker-compose exec backend bash

# Install new dependencies
docker-compose exec backend pip install package-name
```

### Cleanup

```bash
# Stop and remove containers
docker-compose down

# Remove containers and volumes
docker-compose down -v

# Remove everything including images
docker-compose down -v --rmi all
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GOOGLE_GEMINI_API_KEY` | Google Gemini API key for transcription | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key for Mistral 7B | Yes |
| `PORT` | Server port (default: 8000) | No |
| `HOST` | Server host (default: 0.0.0.0) | No |

## Chrome Extension Configuration

The extension is already configured to use `http://localhost:8000/api`

Just load it in Chrome:
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `chrome-extension` folder

## Troubleshooting

### Backend not starting?

```bash
# Check logs
docker-compose logs backend

# Check if port 8000 is in use
lsof -i :8000

# Restart services
docker-compose restart
```

### API keys not working?

```bash
# Verify environment variables
docker-compose exec backend env | grep API_KEY

# Test Gemini API
# Visit: https://aistudio.google.com/app/apikey

# Test OpenRouter API
# Visit: https://openrouter.ai/keys
```

### Transcription failing?

```bash
# Check if Gemini API key is valid
docker-compose exec backend python -c "import os; print(os.getenv('GOOGLE_GEMINI_API_KEY'))"

# View detailed logs
docker-compose logs -f backend
```

## Production Deployment

For production, update environment variables and add:

```yaml
services:
  backend:
    command: ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

## Next Steps

1. ✅ Backend running in Docker
2. Load Chrome extension
3. Test recording and transcription
4. Add PostgreSQL for persistent storage
5. Deploy to cloud (Railway, Fly.io, or Render)

## Support

- Check logs: `docker-compose logs -f`
- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
