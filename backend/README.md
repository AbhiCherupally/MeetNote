# MeetNote Backend API

A clean, production-ready Node.js backend for the MeetNote AI meeting assistant.

## ✨ Features

- **Authentication**: JWT-based user registration and login
- **Meeting Management**: Create, start, end meetings
- **AI Integration**: OpenRouter AI analysis with Mistral 7B
- **Real-time Updates**: Socket.IO for live transcription
- **Chrome Extension Support**: Dedicated API endpoints
- **Production Ready**: Optimized for Render deployment

## 🚀 Quick Start

### Local Development
```bash
npm install
npm run dev
```

### Production Deployment
```bash
npm start
```

## 📋 API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication  
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Meetings
- `GET /api/meetings` - Get user meetings
- `POST /api/meetings` - Create new meeting
- `POST /api/meetings/:id/start` - Start meeting
- `POST /api/meetings/:id/end` - End meeting  
- `POST /api/meetings/:id/analyze` - AI analysis

### Extension
- `POST /api/extension/detect-meeting` - Detect meeting platform

## 🔧 Environment Variables

```env
NODE_ENV=production
PORT=10000
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-openrouter-key
ASSEMBLYAI_API_KEY=your-assemblyai-key
CORS_ORIGIN=https://your-frontend-url
```

## 🌐 Render Deployment

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

**Build Command**: `npm install`
**Start Command**: `npm start`

## 🔒 Security Features

- Helmet.js security headers
- CORS protection
- Rate limiting
- JWT token authentication
- Input validation

## 📊 Monitoring

- Health check endpoint at `/health`
- Request logging with Morgan
- Error handling middleware
- Graceful shutdown handling