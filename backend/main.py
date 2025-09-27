import asyncio
import json
import os
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import websockets
import uvicorn

# Optional imports with fallback
try:
    import assemblyai as aai
except ImportError:
    aai = None
    
try:
    from jose import JWTError, jwt
except ImportError:
    jwt = None
    JWTError = Exception
    
try:
    from passlib.context import CryptContext
except ImportError:
    CryptContext = None
    
try:
    import asyncpg
except ImportError:
    asyncpg = None
import os
import logging
from datetime import datetime
from typing import Dict, List, Optional
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import assemblyai as aai
import websockets
import asyncio
import uvicorn

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# JWT Configuration
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto") if CryptContext else None

# Database Configuration
DATABASE_URL = os.getenv('DATABASE_URL')
db_pool = None

# Initialize AssemblyAI
if aai:
    aai.settings.api_key = os.getenv('ASSEMBLYAI_API_KEY')

# Data models
class User(BaseModel):
    id: str
    email: str
    name: str
    created_at: datetime

class Meeting(BaseModel):
    id: str
    title: str
    platform: str
    meeting_url: str
    meeting_id: Optional[str] = None
    user_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    transcript: List[Dict] = []
    summary: Optional[str] = None
    highlights: List[Dict] = []
    status: str = "active"

class TranscriptEntry(BaseModel):
    speaker: str
    text: str
    timestamp: str
    confidence: float

class CreateMeetingRequest(BaseModel):
    title: str
    platform: str
    meeting_url: str
    meeting_id: Optional[str] = None
    start_time: Optional[str] = None

class HighlightRequest(BaseModel):
    meeting_id: str
    text: str
    timestamp: str
    type: str = "important"

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int
    user: dict

class TokenData(BaseModel):
    email: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str

# In-memory storage (fallback if no database)
users_db: Dict[str, User] = {}
meetings_db: Dict[str, Meeting] = {}
auth_tokens: Dict[str, str] = {}  # token -> user_id

# Database Functions
async def init_db():
    """Initialize database connection and create tables"""
    global db_pool
    if DATABASE_URL:
        try:
            # Parse DATABASE_URL for asyncpg
            db_url = DATABASE_URL
            if db_url.startswith('postgres://'):
                db_url = db_url.replace('postgres://', 'postgresql://', 1)
            
            db_pool = await asyncpg.create_pool(db_url, min_size=1, max_size=10)
            
            # Create tables
            async with db_pool.acquire() as conn:
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS users (
                        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                        email VARCHAR(255) UNIQUE NOT NULL,
                        name VARCHAR(255) NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        created_at TIMESTAMP DEFAULT NOW(),
                        updated_at TIMESTAMP DEFAULT NOW()
                    );
                ''')
                
                await conn.execute('''
                    CREATE TABLE IF NOT EXISTS meetings (
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
                ''')
                
                # Create indexes
                await conn.execute('CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);')
                await conn.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);')
                
            logger.info("✅ Database initialized successfully")
        except Exception as e:
            logger.error(f"❌ Database initialization failed: {e}")
            db_pool = None
    else:
        logger.warning("⚠️  No DATABASE_URL provided, using in-memory storage")

# JWT Utility Functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if pwd_context:
        return pwd_context.verify(plain_password, hashed_password)
    else:
        # Fallback for demo - direct comparison
        return plain_password == hashed_password

def get_password_hash(password: str) -> str:
    if pwd_context:
        return pwd_context.hash(password)
    else:
        # Fallback for demo - return plain password
        return password

def create_access_token(data: dict, expires_delta: Union[timedelta, None] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return TokenData(email=email)
    except JWTError:
        return None

# Database User Functions
async def get_user_by_email(email: str):
    if db_pool:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow('SELECT * FROM users WHERE email = $1', email)
            if row:
                return User(
                    id=str(row['id']),
                    email=row['email'],
                    name=row['name'],
                    created_at=row['created_at']
                )
    else:
        # Fallback to in-memory
        for user in users_db.values():
            if user.email == email:
                return user
    return None

async def create_user(email: str, password: str, name: str):
    password_hash = get_password_hash(password)
    
    if db_pool:
        async with db_pool.acquire() as conn:
            try:
                row = await conn.fetchrow(
                    'INSERT INTO users (email, name, password_hash) VALUES ($1, $2, $3) RETURNING *',
                    email, name, password_hash
                )
                return User(
                    id=str(row['id']),
                    email=row['email'],
                    name=row['name'],
                    created_at=row['created_at']
                )
            except Exception as e:
                if 'duplicate key' in str(e):
                    raise HTTPException(status_code=400, detail="Email already registered")
                raise e
    else:
        # Fallback to in-memory
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            email=email,
            name=name,
            created_at=datetime.now()
        )
        users_db[user_id] = user
        return user

async def authenticate_user(email: str, password: str):
    logger.info(f"🔍 Authenticating user: {email}")
    logger.info(f"🔍 Database pool available: {db_pool is not None}")
    
    # Always check demo users first for development
    demo_users = {
        'abhi@meetnote.app': {'name': 'Abhi', 'password': 'admin123'},
        'sree@meetnote.app': {'name': 'Sree', 'password': 'admin123'},
        'test@meetnote.com': {'name': 'Test User', 'password': 'testpassword123'}
    }
    
    if email in demo_users:
        logger.info(f"🔍 Found demo user: {email}")
        if password == demo_users[email]['password']:
            logger.info(f"✅ Password match for {email}")
            # Create or return user
            user_id = str(uuid.uuid4())
            user = User(
                id=user_id,
                email=email,
                name=demo_users[email]['name'],
                created_at=datetime.now()
            )
            users_db[user_id] = user
            return user
        else:
            logger.info(f"❌ Password mismatch for {email}")
            
    # If not a demo user, try database
    if db_pool:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow('SELECT * FROM users WHERE email = $1', email)
            if row and verify_password(password, row['password_hash']):
                return User(
                    id=str(row['id']),
                    email=row['email'],
                    name=row['name'],
                    created_at=row['created_at']
                )
    
    logger.info(f"❌ Authentication failed for {email}")
    return None

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.meeting_connections: Dict[str, List[str]] = {}
        self.transcription_sessions: Dict[str, dict] = {}  # Store session info as dict

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        logger.info(f"Client {client_id} connected")

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
        
        # Clean up meeting connections
        for meeting_id, connections in self.meeting_connections.items():
            if client_id in connections:
                connections.remove(client_id)
        
        # Clean up transcription session
        if client_id in self.transcription_sessions:
            try:
                del self.transcription_sessions[client_id]
            except Exception as e:
                logger.error(f"Error cleaning up transcription session: {e}")
        
        logger.info(f"Client {client_id} disconnected")

    async def join_meeting(self, client_id: str, meeting_id: str):
        if meeting_id not in self.meeting_connections:
            self.meeting_connections[meeting_id] = []
        if client_id not in self.meeting_connections[meeting_id]:
            self.meeting_connections[meeting_id].append(client_id)
        logger.info(f"Client {client_id} joined meeting {meeting_id}")

    async def broadcast_to_meeting(self, meeting_id: str, message: dict):
        if meeting_id in self.meeting_connections:
            disconnected_clients = []
            for client_id in self.meeting_connections[meeting_id]:
                if client_id in self.active_connections:
                    try:
                        await self.active_connections[client_id].send_text(json.dumps(message))
                    except:
                        disconnected_clients.append(client_id)
                else:
                    disconnected_clients.append(client_id)
            
            # Clean up disconnected clients
            for client_id in disconnected_clients:
                self.meeting_connections[meeting_id].remove(client_id)

manager = ConnectionManager()

class AssemblyAITranscriptionService:
    def __init__(self):
        self.active_sessions: Dict[str, dict] = {}
        self.api_key = os.getenv('ASSEMBLYAI_API_KEY')
        
    async def start_realtime_transcription(self, client_id: str, meeting_id: str, on_transcript_callback):
        """Start real-time transcription using AssemblyAI"""
        try:
            if not self.api_key or not aai:
                logger.warning("AssemblyAI not configured, using mock transcription")
                session_info = {
                    'client_id': client_id,
                    'meeting_id': meeting_id,
                    'status': 'active',
                    'callback': on_transcript_callback,
                    'mode': 'mock'
                }
            else:
                # TODO: Initialize real AssemblyAI real-time transcription
                # This would require WebSocket connection to AssemblyAI
                logger.info(f"Starting AssemblyAI transcription for {client_id}")
                session_info = {
                    'client_id': client_id,
                    'meeting_id': meeting_id,
                    'status': 'active',
                    'callback': on_transcript_callback,
                    'mode': 'assemblyai',
                    'api_key': self.api_key
                }
            
            self.active_sessions[client_id] = session_info
            logger.info(f"Started transcription session for client {client_id}, meeting {meeting_id}")
            
            return session_info

        except Exception as e:
            logger.error(f"Failed to start transcription: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start transcription: {str(e)}")

    async def stop_transcription(self, client_id: str):
        """Stop transcription session"""
        if client_id in self.active_sessions:
            try:
                session = self.active_sessions[client_id]
                # TODO: Close AssemblyAI connection if using real API
                
                del self.active_sessions[client_id]
                if client_id in manager.transcription_sessions:
                    del manager.transcription_sessions[client_id]
                    
                logger.info(f"Stopped transcription for client {client_id}")
            except Exception as e:
                logger.error(f"Error stopping transcription: {e}")

    async def process_audio_chunk(self, client_id: str, audio_data: bytes):
        """Process audio chunk and return transcription"""
        if client_id not in self.active_sessions:
            return None
            
        session = self.active_sessions[client_id]
        
        try:
            if session.get('mode') == 'assemblyai' and aai:
                # TODO: Send audio to AssemblyAI real-time API
                # For now, return mock transcription
                return {
                    "text": f"[AssemblyAI processing {len(audio_data)} bytes]",
                    "confidence": 0.95,
                    "is_final": False
                }
            else:
                # Mock transcription
                return {
                    "text": f"Mock transcription of audio chunk ({len(audio_data)} bytes)",
                    "confidence": 0.80,
                    "is_final": False
                }
                
        except Exception as e:
            logger.error(f"Error processing audio chunk: {e}")
            return None

    async def transcribe_audio_file(self, audio_url: str, meeting_id: str) -> dict:
        """Transcribe audio file using AssemblyAI"""
        try:
            if not aai or not self.api_key:
                return {
                    "transcript": [{"speaker": "Speaker 1", "text": "AssemblyAI not configured", "timestamp": datetime.now().isoformat(), "confidence": 0.0}],
                    "summary": "AssemblyAI transcription not available",
                    "highlights": []
                }
                
            config = aai.TranscriptionConfig(
                speaker_labels=True,
                auto_highlights=True,
                summary_model=aai.SummaryModel.informative,
                summary_type=aai.SummaryType.bullets
            )
            
            transcriber = aai.Transcriber()
            transcript = transcriber.transcribe(audio_url, config)
            
            # Process the transcript
            formatted_transcript = []
            if transcript.utterances:
                for utterance in transcript.utterances:
                    formatted_transcript.append({
                        "speaker": f"Speaker {utterance.speaker}",
                        "text": utterance.text,
                        "timestamp": datetime.now().isoformat(),
                        "confidence": utterance.confidence
                    })
            
            return {
                "transcript": formatted_transcript,
                "summary": transcript.summary,
                "highlights": transcript.auto_highlights.results if transcript.auto_highlights else []
            }
            
        except Exception as e:
            logger.error(f"File transcription error: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

transcription_service = AssemblyAITranscriptionService()

# Authentication
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    token_data = verify_token(token)
    
    if token_data is None:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    user = await get_user_by_email(email=token_data.email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting MeetNote Backend Server...")
    await init_db()
    yield
    if db_pool:
        await db_pool.close()
    logger.info("👋 Shutting down MeetNote Backend Server...")

app = FastAPI(
    title="MeetNote API",
    description="Real-time meeting transcription and summarization service",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
@app.get("/")
async def root():
    return {
        "message": "MeetNote API v2.0 - Python Backend",
        "status": "running",
        "features": ["real-time transcription", "AI summarization", "WebSocket support"]
    }

@app.get("/api/health")
async def health_check():
    assemblyai_status = "configured" if aai and aai.settings.api_key else "not configured"
    database_status = "connected" if db_pool else "in-memory"
    jwt_status = "configured" if JWT_SECRET_KEY != 'your-secret-key-change-in-production' else "default"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "2.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "services": {
            "api": "running",
            "websocket": "running",
            "assemblyai": assemblyai_status,
            "database": database_status,
            "jwt": jwt_status,
            "python": "active"
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = await authenticate_user(user_data.email, user_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    logger.info(f"✅ User authenticated: {user.email}")
    return {
        "success": True,
        "token": access_token,
        "user": user.dict(),
        "message": "Login successful"
    }

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user = await create_user(user_data.email, user_data.password, user_data.name)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    logger.info(f"✅ New user registered: {user.email}")
    return Token(
        access_token=access_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user.dict()
    )

@app.get("/api/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user info from JWT token"""
    return current_user.dict()

@app.post("/api/auth/verify-token")
async def verify_jwt_token(current_user: User = Depends(get_current_user)):
    """Verify if JWT token is valid and return user info"""
    return {
        "valid": True,
        "user": current_user.dict(),
        "message": "Token is valid"
    }

@app.get("/api/auth/extract-token")
async def extract_token_info(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Extract and decode JWT token information for debugging/development"""
    token = credentials.credentials
    token_data = verify_token(token)
    
    if not token_data:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    # Decode without verification for debugging
    try:
        if jwt:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return {
                "token": token[:20] + "...",  # Only show first 20 chars for security
                "payload": payload,
                "email": token_data.email,
                "expires": payload.get("exp"),
                "issued_at": payload.get("iat"),
                "algorithm": JWT_ALGORITHM
            }
        else:
            return {
                "token": token[:20] + "...",
                "email": token_data.email,
                "note": "JWT library not available"
            }
    except Exception as e:
        return {
            "token": token[:20] + "...",
            "email": token_data.email,
            "error": str(e)
        }

@app.get("/api/auth/status")
async def auth_status(current_user: User = Depends(get_current_user)):
    return {
        "authenticated": True,
        "user": current_user.dict()
    }

@app.post("/api/meetings")
async def create_meeting(
    meeting_data: CreateMeetingRequest,
    current_user: User = Depends(get_current_user)
):
    meeting_id = str(uuid.uuid4())
    
    meeting = Meeting(
        id=meeting_id,
        title=meeting_data.title,
        platform=meeting_data.platform,
        meeting_url=meeting_data.meeting_url,
        meeting_id=meeting_data.meeting_id,
        user_id=current_user.id,
        start_time=datetime.fromisoformat(meeting_data.start_time) if meeting_data.start_time else datetime.now(),
        transcript=[],
        highlights=[]
    )
    
    meetings_db[meeting_id] = meeting
    logger.info(f"Created meeting {meeting_id} for user {current_user.email}")
    
    return {
        "success": True,
        "meeting": meeting.dict()
    }

@app.get("/api/meetings")
async def get_meetings(current_user: User = Depends(get_current_user)):
    user_meetings = [
        meeting.dict() for meeting in meetings_db.values()
        if meeting.user_id == current_user.id
    ]
    return {"meetings": user_meetings}

@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, current_user: User = Depends(get_current_user)):
    meeting = None
    
    if db_pool:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT * FROM meetings WHERE id = $1 AND user_id = $2',
                meeting_id, current_user.id
            )
            if row:
                meeting = Meeting(
                    id=str(row['id']),
                    title=row['title'],
                    platform=row['platform'],
                    meeting_url=row['meeting_url'],
                    meeting_id=row['meeting_id'],
                    user_id=str(row['user_id']),
                    start_time=row['start_time'],
                    end_time=row['end_time'],
                    transcript=row['transcript'] or [],
                    summary=row['summary'] or "",
                    highlights=row['highlights'] or [],
                    status=row['status'],
                    created_at=row['created_at']
                )
    else:
        # Fallback to in-memory
        if meeting_id in meetings_db and meetings_db[meeting_id].user_id == current_user.id:
            meeting = meetings_db[meeting_id]
    
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    return meeting.dict()

@app.post("/api/meetings/{meeting_id}/stop")
async def stop_meeting(meeting_id: str, current_user: User = Depends(get_current_user)):
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = meetings_db[meeting_id]
    if meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    meeting.end_time = datetime.now()
    meeting.status = "completed"
    
    logger.info(f"Stopped meeting {meeting_id}")
    return {"success": True, "meeting": meeting.dict()}

@app.post("/api/meetings/{meeting_id}/highlights")
async def create_highlight(
    meeting_id: str,
    highlight_data: HighlightRequest,
    current_user: User = Depends(get_current_user)
):
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = meetings_db[meeting_id]
    if meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    highlight = {
        "id": str(uuid.uuid4()),
        "text": highlight_data.text,
        "timestamp": highlight_data.timestamp,
        "type": highlight_data.type,
        "created_at": datetime.now().isoformat()
    }
    
    meeting.highlights.append(highlight)
    logger.info(f"Created highlight for meeting {meeting_id}")
    
    return {"success": True, "highlight": highlight}

@app.post("/api/transcribe-file")
async def transcribe_file(
    audio_url: str,
    meeting_id: str,
    current_user: User = Depends(get_current_user)
):
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = meetings_db[meeting_id]
    if meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await transcription_service.transcribe_audio_file(audio_url, meeting_id)
    return {"success": True, **result}

# WebSocket endpoint
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "join-meeting":
                meeting_id = message["meetingId"]
                await manager.join_meeting(client_id, meeting_id)
                await websocket.send_text(json.dumps({
                    "type": "joined-meeting",
                    "meetingId": meeting_id
                }))
            
            elif message["type"] == "start-transcription":
                meeting_id = message["meetingId"]
                
                async def on_transcript(transcript_text):
                    transcript_data = {
                        "type": "transcript-update",
                        "meetingId": meeting_id,
                        "speaker": "Speaker 1",  # Simplified for now
                        "text": transcript_text,
                        "timestamp": datetime.now().isoformat(),
                        "confidence": 0.95
                    }
                    
                    # Save to meeting
                    if meeting_id in meetings_db:
                        meetings_db[meeting_id].transcript.append(transcript_data)
                    
                    # Broadcast to meeting participants
                    await manager.broadcast_to_meeting(meeting_id, transcript_data)
                
                try:
                    session_info = await transcription_service.start_realtime_transcription(
                        client_id, meeting_id, on_transcript
                    )
                    
                    await websocket.send_text(json.dumps({
                        "type": "transcription-started",
                        "meetingId": meeting_id
                    }))
                    
                except Exception as e:
                    await websocket.send_text(json.dumps({
                        "type": "transcription-error",
                        "error": str(e)
                    }))
            
            elif message["type"] == "audio-data":
                if client_id in manager.transcription_sessions:
                    try:
                        # Process real audio data
                        audio_data = message.get("audioData", [])
                        sample_rate = message.get("sampleRate", 16000)
                        audio_format = message.get("format", "pcm16")
                        
                        if len(audio_data) > 100:  # Only process larger chunks
                            logger.info(f"Processing audio data: {len(audio_data)} bytes at {sample_rate}Hz")
                            
                            # Convert audio data for AssemblyAI
                            if aai and aai.settings.api_key:
                                try:
                                    # Convert array to bytes
                                    audio_bytes = bytes(audio_data)
                                    
                                    # TODO: Send to AssemblyAI real-time API
                                    # For now, simulate transcription
                                    await asyncio.sleep(0.1)
                                    
                                    # Send simulated transcript update
                                    transcript_data = {
                                        "type": "transcript-update",
                                        "meetingId": manager.transcription_sessions[client_id].get('meeting_id', ''),
                                        "speaker": "Speaker 1",
                                        "text": f"[Audio processed - {len(audio_bytes)} bytes at {datetime.now().strftime('%H:%M:%S')}]",
                                        "timestamp": datetime.now().isoformat(),
                                        "confidence": 0.95,
                                        "isProcessed": True
                                    }
                                    
                                    await websocket.send_text(json.dumps(transcript_data))
                                    
                                except Exception as e:
                                    logger.error(f"Audio processing error: {e}")
                            else:
                                # Fallback for demo without AssemblyAI
                                transcript_data = {
                                    "type": "transcript-update",
                                    "meetingId": manager.transcription_sessions[client_id].get('meeting_id', ''),
                                    "speaker": "Speaker 1", 
                                    "text": f"Demo audio received: {len(audio_data)} samples",
                                    "timestamp": datetime.now().isoformat(),
                                    "confidence": 0.85
                                }
                                
                                await websocket.send_text(json.dumps(transcript_data))
                        
                    except Exception as e:
                        logger.error(f"Error processing audio data: {e}")
            
            elif message["type"] == "stop-transcription":
                await transcription_service.stop_transcription(client_id)
                await websocket.send_text(json.dumps({
                    "type": "transcription-stopped"
                }))
    
    except WebSocketDisconnect:
        manager.disconnect(client_id)
        await transcription_service.stop_transcription(client_id)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True if os.getenv("ENVIRONMENT") == "development" else False,
        log_level="info"
    )