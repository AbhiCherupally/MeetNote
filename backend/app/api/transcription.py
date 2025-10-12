"""
Transcription API routes
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import Optional
import logging
import base64

from app.services.whisper_service import WhisperService
from app.core.security import get_current_user
from app.db import models

router = APIRouter()
logger = logging.getLogger(__name__)

whisper_service = WhisperService()


class TranscriptionRequest(BaseModel):
    audio_base64: str
    language: Optional[str] = "en"


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration: float
    segments: list


@router.post("/transcribe-file", response_model=TranscriptionResponse)
async def transcribe_file(
    audio: UploadFile = File(...),
    language: str = "en",
    current_user: models.User = Depends(get_current_user)
):
    """Transcribe an uploaded audio file"""
    
    try:
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            content = await audio.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        # Transcribe
        result = await whisper_service.transcribe_file(tmp_path, language)
        
        # Clean up
        os.unlink(tmp_path)
        
        return result
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )


@router.post("/transcribe-base64", response_model=TranscriptionResponse)
async def transcribe_base64(
    request: TranscriptionRequest,
    current_user: models.User = Depends(get_current_user)
):
    """Transcribe base64 encoded audio"""
    
    try:
        result = await whisper_service.transcribe_base64(
            request.audio_base64,
            request.language
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcription failed: {str(e)}"
        )
