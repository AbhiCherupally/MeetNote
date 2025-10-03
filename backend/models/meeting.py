from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TranscriptSegment(BaseModel):
    timestamp: str
    text: str
    speaker: Optional[str] = "Unknown"

class Meeting(BaseModel):
    id: str
    title: str
    date: str
    transcript: List[TranscriptSegment]
    summary: Optional[str] = None
    action_items: Optional[List[str]] = None
    created_at: datetime
    user_id: str

class CreateMeetingRequest(BaseModel):
    title: str
    audio_data: str  # base64 encoded audio

class TranscribeRequest(BaseModel):
    audio_data: str  # base64 encoded audio
    format: str = "webm"
