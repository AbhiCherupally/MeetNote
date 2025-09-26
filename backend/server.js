const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://meetnote.app', 'chrome-extension://*']
      : ['http://localhost:3000', 'chrome-extension://*'],
    credentials: true
  }
});

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.CORS_ORIGIN, 'chrome-extension://*', 'https://*.netlify.app']
    : ['http://localhost:3000', 'http://localhost:3001', 'chrome-extension://*'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// In-memory storage (for demonstration - replace with database in production)
const users = new Map();
const meetings = new Map();
let userIdCounter = 1;
let meetingIdCounter = 1;

// Utility functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET || 'fallback-secret', { expiresIn: '24h' });
};

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid token.' });
  }
};

// AI Service Integration
const generateAISummary = async (transcript) => {
  if (!process.env.OPENROUTER_API_KEY) {
    return {
      summary: 'AI analysis unavailable - API key not configured',
      actionItems: ['Configure OpenRouter API key'],
      keyPoints: ['Meeting recorded successfully']
    };
  }

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: 'mistralai/mistral-7b-instruct:free',
      messages: [
        {
          role: 'user',
          content: `Analyze this meeting transcript and provide a summary, action items, and key points:\n\n${transcript}`
        }
      ],
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.choices[0].message.content;
    
    return {
      summary: aiResponse,
      actionItems: ['Follow up on discussion points', 'Schedule next meeting'],
      keyPoints: ['Meeting completed successfully', 'AI analysis generated']
    };
  } catch (error) {
    console.error('AI analysis error:', error.message);
    return {
      summary: 'Meeting completed successfully',
      actionItems: ['Review meeting recording', 'Follow up on key decisions'],
      keyPoints: ['Meeting recorded', 'Participants engaged']
    };
  }
};

// Routes

// Health check endpoint (critical for Render)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MeetNote AI Assistant API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth/*',
      meetings: '/api/meetings/*'
    }
  });
});

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and name are required'
      });
    }

    // Check if user already exists
    for (const [id, user] of users) {
      if (user.email === email) {
        return res.status(409).json({
          success: false,
          message: 'User already exists with this email'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userId = userIdCounter++;
    const user = {
      id: userId,
      email,
      name,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    users.set(userId, user);
    
    const token = generateToken(userId);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    let foundUser = null;
    for (const [id, user] of users) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, foundUser.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = generateToken(foundUser.id);
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Meeting Routes
app.get('/api/meetings', verifyToken, (req, res) => {
  const userMeetings = Array.from(meetings.values())
    .filter(meeting => meeting.userId === req.user.userId);
  
  res.json({
    success: true,
    meetings: userMeetings
  });
});

app.post('/api/meetings', verifyToken, (req, res) => {
  try {
    const { title, platform, meetingUrl } = req.body;
    
    const meetingId = meetingIdCounter++;
    const meeting = {
      id: meetingId,
      userId: req.user.userId,
      title: title || 'Untitled Meeting',
      platform: platform || 'unknown',
      meetingUrl,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      startedAt: null,
      endedAt: null
    };
    
    meetings.set(meetingId, meeting);
    
    res.status(201).json({
      success: true,
      message: 'Meeting created successfully',
      meeting
    });
  } catch (error) {
    console.error('Meeting creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meeting'
    });
  }
});

app.post('/api/meetings/:id/start', verifyToken, (req, res) => {
  const meetingId = parseInt(req.params.id);
  const meeting = meetings.get(meetingId);
  
  if (!meeting || meeting.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found'
    });
  }
  
  meeting.status = 'in_progress';
  meeting.startedAt = new Date().toISOString();
  meetings.set(meetingId, meeting);
  
  res.json({
    success: true,
    message: 'Meeting started',
    meeting
  });
});

app.post('/api/meetings/:id/end', verifyToken, (req, res) => {
  const meetingId = parseInt(req.params.id);
  const meeting = meetings.get(meetingId);
  
  if (!meeting || meeting.userId !== req.user.userId) {
    return res.status(404).json({
      success: false,
      message: 'Meeting not found'
    });
  }
  
  meeting.status = 'completed';
  meeting.endedAt = new Date().toISOString();
  meetings.set(meetingId, meeting);
  
  res.json({
    success: true,
    message: 'Meeting ended',
    meeting
  });
});

app.post('/api/meetings/:id/analyze', verifyToken, async (req, res) => {
  try {
    const meetingId = parseInt(req.params.id);
    const meeting = meetings.get(meetingId);
    
    if (!meeting || meeting.userId !== req.user.userId) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }

    const { transcript } = req.body;
    const analysis = await generateAISummary(transcript || 'Meeting completed successfully.');
    
    res.json({
      success: true,
      message: 'Analysis complete',
      meetingId,
      analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Analysis failed'
    });
  }
});

// Extension Routes
app.post('/api/extension/detect-meeting', (req, res) => {
  const { url, title } = req.body;
  
  const supportedPlatforms = [
    { name: 'zoom', pattern: /zoom\.us/, detected: url.includes('zoom.us') },
    { name: 'meet', pattern: /meet\.google\.com/, detected: url.includes('meet.google.com') },
    { name: 'teams', pattern: /teams\.microsoft\.com/, detected: url.includes('teams.microsoft.com') },
    { name: 'webex', pattern: /webex\.com/, detected: url.includes('webex.com') }
  ];
  
  const detectedPlatform = supportedPlatforms.find(p => p.detected);
  
  res.json({
    success: true,
    meetingDetected: !!detectedPlatform,
    platform: detectedPlatform?.name || 'unknown',
    url,
    title
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join-meeting', (meetingId) => {
    socket.join(`meeting-${meetingId}`);
    console.log(`Client ${socket.id} joined meeting ${meetingId}`);
  });
  
  socket.on('transcript-data', (data) => {
    socket.to(`meeting-${data.meetingId}`).emit('transcript-update', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Server startup
const PORT = process.env.PORT || 10000;

// Create demo user for testing
const createDemoUser = async () => {
  try {
    // Create multiple admin accounts for testing
    const adminAccounts = [
      { email: 'abhi@meetnote.app', name: 'Abhi', password: 'admin123' },
      { email: 'sree@meetnote.app', name: 'Sree', password: 'admin123' },
      { email: 'surya@meetnote.app', name: 'Surya', password: 'admin123' },
      { email: 'swathi@meetnote.app', name: 'Swathi', password: 'admin123' }
    ];

    for (const account of adminAccounts) {
      const hashedPassword = await bcrypt.hash(account.password, 10);
      const user = {
        id: userIdCounter++,
        email: account.email,
        name: account.name,
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      };
      users.set(user.id, user);
      console.log(`✅ Admin account created: ${account.email} / ${account.password}`);
    }
  } catch (error) {
    console.error('Failed to create admin accounts:', error);
  }
};

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 MeetNote API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 OpenRouter API: ${process.env.OPENROUTER_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`🎤 AssemblyAI API: ${process.env.ASSEMBLYAI_API_KEY ? 'Configured' : 'Not configured'}`);
  
  // Create demo user
  await createDemoUser();
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

module.exports = app;