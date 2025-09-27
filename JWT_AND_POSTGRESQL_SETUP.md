# JWT Authentication & PostgreSQL Setup Guide

This guide covers setting up JWT authentication and PostgreSQL database for your MeetNote backend on Render.com.

## 🔐 JWT Authentication Features

Your backend now supports:
- **Secure JWT tokens** with configurable expiration
- **Password hashing** using bcrypt
- **User registration** and authentication
- **Token extraction** endpoints for debugging
- **Database-backed** user storage

## 🗄️ PostgreSQL Database Setup on Render

### 1. Create PostgreSQL Database on Render

1. Go to [Render.com](https://render.com) dashboard
2. Click **"New"** → **"PostgreSQL"**
3. Configure your database:
   - **Name**: `meetnote-database`
   - **Database**: `meetnote`
   - **User**: `meetnote_user`
   - **Region**: Choose same as your backend service
   - **PostgreSQL Version**: 15 (recommended)
   - **Plan**: Free tier or paid based on needs

4. Click **"Create Database"**
5. Wait for provisioning to complete

### 2. Get Database Connection Details

Once created, Render will provide:
- **Internal Database URL**: `postgresql://meetnote_user:password@hostname:5432/meetnote`
- **External Database URL**: `postgresql://meetnote_user:password@external-hostname:5432/meetnote`

Use the **Internal Database URL** for your backend service.

### 3. Update Environment Variables

In your Render backend service settings, add these environment variables:

```bash
# Database Configuration
DATABASE_URL=postgresql://your_user:your_password@your_host:5432/your_db

# JWT Configuration (IMPORTANT: Change this secret!)
JWT_SECRET_KEY=your-super-secure-secret-key-minimum-32-characters-long

# API Keys (you already have these)
ASSEMBLYAI_API_KEY=598c0c5952444246ba2c1af3eb010d0b
OPENROUTER_API_KEY=sk-or-v1-784d...
```

**⚠️ IMPORTANT**: Generate a strong JWT secret key:
```bash
# Use this command to generate a secure secret:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Database Schema

The backend automatically creates these tables on startup:

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Meetings table  
CREATE TABLE meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    meeting_url TEXT,
    meeting_id VARCHAR(255),
    user_id UUID REFERENCES users(id),
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    transcript JSONB DEFAULT '[]',
    summary TEXT,
    highlights JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_users_email ON users(email);
```

## 🚀 New API Endpoints

### Authentication Endpoints

#### 1. Register New User
```bash
POST /api/auth/register
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "secure_password",
    "name": "John Doe"
}
```

**Response:**
```json
{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "token_type": "bearer",
    "expires_in": 1800,
    "user": {
        "id": "uuid",
        "email": "user@example.com", 
        "name": "John Doe",
        "created_at": "2024-01-01T00:00:00"
    }
}
```

#### 2. Login User
```bash
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "secure_password"
}
```

#### 3. Get Current User Info
```bash
GET /api/auth/me
Authorization: Bearer your-jwt-token
```

#### 4. Verify Token
```bash
POST /api/auth/verify-token
Authorization: Bearer your-jwt-token
```

#### 5. Extract Token Info (Debug)
```bash
GET /api/auth/extract-token
Authorization: Bearer your-jwt-token
```

**Response:**
```json
{
    "token": "eyJ0eXAiOiJKV1QiLCJ...",
    "payload": {
        "sub": "user@example.com",
        "exp": 1704067200,
        "iat": 1704065400
    },
    "email": "user@example.com",
    "expires": 1704067200,
    "algorithm": "HS256"
}
```

## 🔧 Testing JWT Authentication

### 1. Register a New User
```bash
curl -X POST https://meetnote-backend.onrender.com/api/auth/register \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "name": "Test User"
  }'
```

### 2. Extract Token Information
```bash
# Use the token from registration response
curl -X GET https://meetnote-backend.onrender.com/api/auth/extract-token \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

### 3. Test Protected Endpoints
```bash
# Get user meetings
curl -X GET https://meetnote-backend.onrender.com/api/meetings \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"

# Get user info
curl -X GET https://meetnote-backend.onrender.com/api/auth/me \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
```

## 📊 Database vs In-Memory Fallback

The backend automatically detects if PostgreSQL is available:

- **✅ With DATABASE_URL**: Uses PostgreSQL for persistent storage
- **⚠️ Without DATABASE_URL**: Falls back to in-memory storage (data lost on restart)

Check the health endpoint to see current status:
```bash
curl https://meetnote-backend.onrender.com/api/health
```

Response shows database status:
```json
{
    "status": "healthy",
    "services": {
        "database": "connected",  // or "in-memory"
        "jwt": "configured"       // or "default"
    }
}
```

## 🔒 Security Best Practices

1. **Change JWT Secret**: Never use the default secret in production
2. **Use HTTPS**: Always use secure connections
3. **Token Expiration**: Tokens expire in 30 minutes by default
4. **Password Hashing**: Passwords are hashed with bcrypt
5. **Database Security**: Use Render's secure PostgreSQL connections

## 🐛 Troubleshooting

### Database Connection Issues
- Check DATABASE_URL format: `postgresql://user:password@host:port/database`
- Ensure database is running and accessible
- Check Render service logs for connection errors

### JWT Token Issues
- Verify JWT_SECRET_KEY is set and not default
- Check token hasn't expired (30 min default)
- Ensure Bearer token format: `Authorization: Bearer token`

### Authentication Failures
- Verify email/password combination
- Check user exists in database
- Confirm API request format and headers

## 📝 Production Checklist

- [ ] PostgreSQL database created and configured
- [ ] DATABASE_URL environment variable set
- [ ] Strong JWT_SECRET_KEY generated and set
- [ ] API keys configured (AssemblyAI, OpenRouter)
- [ ] Health check shows "connected" database status
- [ ] Test user registration and authentication
- [ ] Verify token extraction works correctly
- [ ] Chrome extension updated with new auth endpoints

Your backend now has production-ready authentication and database storage! 🎉