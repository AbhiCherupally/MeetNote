"""
MeetNote Backend - FastAPI Application
Audio transcription with Whisper AI and summarization with OpenRouter
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging
from typing import List, Optional
import os

from app.core.config import settings
from app.api import auth, meetings, transcription
from app.db.database import engine, Base
from app.services.whisper_service import WhisperService
from app.core.websocket_manager import ConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize services
whisper_service = WhisperService()
ws_manager = ConnectionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("Starting MeetNote Backend...")
    logger.info(f"Environment: {settings.ENVIRONMENT}")
    
    # Drop and recreate database tables (fixes schema conflicts on Render)
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Dropped existing tables")
    except Exception as e:
        logger.warning(f"Could not drop tables: {e}")
    
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Initialize Whisper model
    await whisper_service.initialize()
    logger.info("Whisper model loaded")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MeetNote Backend...")
    whisper_service.cleanup()


# Create FastAPI app
app = FastAPI(
    title="MeetNote API",
    description="AI-powered meeting transcription and summarization",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://meetnoteapp.netlify.app",
        "chrome-extension://*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# Health Check
@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": "MeetNote API",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint for frontend"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "whisper": whisper_service.is_ready(),
            "database": "connected"
        }
    }


# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(meetings.router, prefix="/api/meetings", tags=["Meetings"])
app.include_router(transcription.router, prefix="/api/transcription", tags=["Transcription"])


# WebSocket endpoint for real-time transcription
@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    """WebSocket connection for real-time audio streaming and transcription"""
    await ws_manager.connect(websocket, client_id)
    logger.info(f"Client {client_id} connected via WebSocket")
    
    try:
        while True:
            # Receive audio data from client
            data = await websocket.receive_bytes()
            
            # Process audio chunk with Whisper
            transcript = await whisper_service.transcribe_chunk(data)
            
            if transcript:
                # Send transcription back to client
                await ws_manager.send_personal_message(
                    {
                        "type": "transcription",
                        "text": transcript["text"],
                        "timestamp": transcript["timestamp"],
                        "confidence": transcript.get("confidence", 0.0)
                    },
                    client_id
                )
    
    except WebSocketDisconnect:
        ws_manager.disconnect(client_id)
        logger.info(f"Client {client_id} disconnected")
    except Exception as e:
        logger.error(f"WebSocket error for client {client_id}: {str(e)}")
        ws_manager.disconnect(client_id)


# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
