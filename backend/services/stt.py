import os
import base64
import google.generativeai as genai
from typing import List, Dict

class STTService:
    def __init__(self):
        # Configure Google Gemini API
        api_key = os.getenv("GOOGLE_GEMINI_API_KEY")
        if not api_key:
            print("⚠️  GOOGLE_GEMINI_API_KEY not set, STT will not work")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
    
    async def transcribe_audio(self, audio_base64: str, audio_format: str = "webm") -> List[Dict[str, str]]:
        """Transcribe audio using Google Gemini API"""
        if not self.model:
            raise Exception("Google Gemini API not configured")
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            
            # Create prompt for transcription
            prompt = """Transcribe this audio into text. Format your response as a JSON array with this structure:
[
  {
    "timestamp": "0:00",
    "text": "transcribed text here",
    "speaker": "Speaker 1"
  }
]

If you can identify multiple speakers, label them as Speaker 1, Speaker 2, etc.
If you cannot determine speakers, use "Unknown" for all.
Provide accurate transcription with proper punctuation."""
            
            # Generate transcription
            response = self.model.generate_content([
                prompt,
                {
                    "mime_type": f"audio/{audio_format}",
                    "data": audio_data
                }
            ])
            
            # Parse response
            import json
            try:
                # Try to extract JSON from response
                text = response.text.strip()
                # Remove markdown code blocks if present
                if text.startswith("```"):
                    text = text.split("```")[1]
                    if text.startswith("json"):
                        text = text[4:]
                    text = text.strip()
                
                transcript_segments = json.loads(text)
                
                # Validate structure
                if not isinstance(transcript_segments, list):
                    raise ValueError("Response is not a list")
                
                # Ensure all segments have required fields
                for seg in transcript_segments:
                    if "text" not in seg:
                        seg["text"] = ""
                    if "timestamp" not in seg:
                        seg["timestamp"] = "0:00"
                    if "speaker" not in seg:
                        seg["speaker"] = "Unknown"
                
                return transcript_segments
                
            except (json.JSONDecodeError, ValueError) as e:
                # Fallback: create single segment from raw text
                print(f"⚠️  Failed to parse JSON response: {e}")
                return [{
                    "timestamp": "0:00",
                    "text": response.text.strip(),
                    "speaker": "Unknown"
                }]
            
        except Exception as e:
            print(f"❌ STT Error: {str(e)}")
            raise Exception(f"Transcription failed: {str(e)}")

stt_service = STTService()
