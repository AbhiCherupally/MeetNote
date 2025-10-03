from fastapi import APIRouter, HTTPException, Header, Body
from typing import Optional, List, Dict
from pydantic import BaseModel
import uuid
from datetime import datetime

from models.meeting import Meeting, TranscribeRequest, TranscriptSegment
from services.stt import stt_service
from services.summarization import summarization_service
from services.storage import storage_service

router = APIRouter()

class CreateMeetingRequest(BaseModel):
    transcript: List[Dict]

@router.post("/transcribe")
async def transcribe_audio(request: TranscribeRequest, authorization: Optional[str] = Header(None)):
    """Transcribe audio to text using Google STT"""
    try:
        # In production, validate the authorization token here
        
        # Transcribe audio
        transcript_segments = await stt_service.transcribe_audio(
            request.audio_data,
            request.format
        )
        
        return {
            "success": True,
            "transcript": transcript_segments
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class CreateMeetingRequest(BaseModel):
    transcript: list

@router.post("/create")
async def create_meeting(
    title: str,
    request: CreateMeetingRequest,
    authorization: Optional[str] = Header(None)
):
    """Create a meeting with transcript and generate summary"""
    try:
        # In production, extract user_id from JWT token
        user_id = "demo-user"
        transcript = request.transcript
        
        # Generate summary and action items
        summary, action_items = await summarization_service.summarize_transcript(transcript)
        
        # Create meeting object
        meeting_id = str(uuid.uuid4())
        meeting_data = {
            "id": meeting_id,
            "title": title,
            "date": datetime.now().isoformat(),
            "transcript": transcript,
            "summary": summary,
            "action_items": action_items,
            "created_at": datetime.now().isoformat(),
            "user_id": user_id
        }
        
        # Store meeting
        await storage_service.create_meeting(meeting_data)
        
        return {
            "success": True,
            "meeting": meeting_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/")
async def get_meetings(authorization: Optional[str] = Header(None)):
    """Get all meetings for the current user"""
    try:
        user_id = "demo-user"
        meetings = await storage_service.get_user_meetings(user_id)
        return {"success": True, "meetings": meetings}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{meeting_id}")
async def get_meeting(meeting_id: str, authorization: Optional[str] = Header(None)):
    """Get a specific meeting"""
    try:
        meeting = await storage_service.get_meeting(meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {"success": True, "meeting": meeting}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{meeting_id}")
async def delete_meeting(meeting_id: str, authorization: Optional[str] = Header(None)):
    """Delete a meeting"""
    try:
        success = await storage_service.delete_meeting(meeting_id)
        if not success:
            raise HTTPException(status_code=404, detail="Meeting not found")
        return {"success": True, "message": "Meeting deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
