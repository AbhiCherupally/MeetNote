import asyncio
import json
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

# Initialize AssemblyAI
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

# In-memory storage (replace with proper database in production)
users_db: Dict[str, User] = {}
meetings_db: Dict[str, Meeting] = {}
auth_tokens: Dict[str, str] = {}  # token -> user_id

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

# AssemblyAI Transcription Service
class TranscriptionService:
    def __init__(self):
        self.active_sessions: Dict[str, dict] = {}  # Store session info as dict

    async def start_realtime_transcription(self, client_id: str, meeting_id: str, on_transcript_callback):
        try:
            # For now, store session info (will implement real-time transcription later)
            session_info = {
                'client_id': client_id,
                'meeting_id': meeting_id,
                'status': 'active',
                'callback': on_transcript_callback
            }
            
            self.active_sessions[client_id] = session_info
            logger.info(f"Started transcription session for client {client_id}, meeting {meeting_id}")
            
            return session_info

        except Exception as e:
            logger.error(f"Failed to start transcription: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to start transcription: {str(e)}")

    async def stop_transcription(self, client_id: str):
        if client_id in self.active_sessions:
            try:
                del self.active_sessions[client_id]
                if client_id in manager.transcription_sessions:
                    del manager.transcription_sessions[client_id]
                logger.info(f"Stopped transcription for client {client_id}")
            except Exception as e:
                logger.error(f"Error stopping transcription: {e}")

    async def transcribe_audio_file(self, audio_url: str, meeting_id: str) -> dict:
        try:
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
            
            # Update meeting in database
            if meeting_id in meetings_db:
                meetings_db[meeting_id].transcript = formatted_transcript
                if transcript.summary:
                    meetings_db[meeting_id].summary = transcript.summary
            
            return {
                "transcript": formatted_transcript,
                "summary": transcript.summary,
                "highlights": transcript.auto_highlights.results if transcript.auto_highlights else []
            }
            
        except Exception as e:
            logger.error(f"File transcription error: {e}")
            raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

transcription_service = TranscriptionService()

# Authentication
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    if token not in auth_tokens:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    
    user_id = auth_tokens[token]
    if user_id not in users_db:
        raise HTTPException(status_code=401, detail="User not found")
    
    return users_db[user_id]

# FastAPI app with lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MeetNote Backend Server...")
    yield
    logger.info("Shutting down MeetNote Backend Server...")

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
    assemblyai_status = "connected" if aai.settings.api_key else "not configured"
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "running",
            "websocket": "running",
            "assemblyai": assemblyai_status
        }
    }

@app.post("/api/auth/login")
async def login(email: str, password: str):
    # Mock authentication - replace with real auth
    user_id = str(uuid.uuid4())
    token = str(uuid.uuid4())
    
    user = User(
        id=user_id,
        email=email,
        name=email.split('@')[0],
        created_at=datetime.now()
    )
    
    users_db[user_id] = user
    auth_tokens[token] = user_id
    
    logger.info(f"User authenticated: {email}")
    return {
        "success": True,
        "token": token,
        "user": user.dict()
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
    if meeting_id not in meetings_db:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    meeting = meetings_db[meeting_id]
    if meeting.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
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
                        # For now, just acknowledge receipt of audio data
                        # Real transcription will be implemented when AssemblyAI real-time API is properly integrated
                        audio_data = message.get("audioData", "")
                        logger.info(f"Received audio data from client {client_id}: {len(audio_data)} bytes")
                        
                        # Simulate transcription for demo purposes
                        if len(audio_data) > 100:  # Only process larger chunks
                            await asyncio.sleep(0.1)  # Simulate processing time
                            
                            # Send mock transcript update
                            transcript_data = {
                                "type": "transcript-update",
                                "meetingId": manager.transcription_sessions[client_id].get('meeting_id', ''),
                                "speaker": "Speaker 1",
                                "text": f"Audio received at {datetime.now().strftime('%H:%M:%S')}",
                                "timestamp": datetime.now().isoformat(),
                                "confidence": 0.95
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