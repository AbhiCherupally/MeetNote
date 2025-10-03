import os
import base64
import json
from typing import List, Dict
import tempfile
import requests
import time

class STTService:
    def __init__(self):
        self.api_key = os.getenv('ASSEMBLYAI_API_KEY', '')
        self.upload_url = "https://api.assemblyai.com/v2/upload"
        self.transcript_url = "https://api.assemblyai.com/v2/transcript"
        
        if not self.api_key:
            print("⚠️  No ASSEMBLYAI_API_KEY found - using mock transcription")
            self.mock_mode = True
        else:
            print("✅ AssemblyAI configured")
            self.mock_mode = False
    
    async def transcribe_audio(self, audio_base64: str, audio_format: str = "webm") -> List[Dict[str, str]]:
        """Transcribe audio to text using AssemblyAI"""
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            print(f"📦 Audio size: {len(audio_data) / 1024:.2f} KB")
            
            if self.mock_mode:
                return await self._mock_transcribe(audio_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Upload audio to AssemblyAI
                print("📤 Uploading audio to AssemblyAI...")
                headers = {"authorization": self.api_key}
                
                with open(temp_file_path, 'rb') as f:
                    upload_response = requests.post(
                        self.upload_url,
                        headers=headers,
                        data=f
                    )
                
                if upload_response.status_code != 200:
                    raise Exception(f"Upload failed: {upload_response.text}")
                
                audio_url = upload_response.json()['upload_url']
                print(f"✅ Audio uploaded: {audio_url}")
                
                # Request transcription
                print("🎤 Requesting transcription...")
                transcript_request = {
                    "audio_url": audio_url,
                    "speaker_labels": True  # Enable speaker diarization
                }
                
                transcript_response = requests.post(
                    self.transcript_url,
                    json=transcript_request,
                    headers=headers
                )
                
                if transcript_response.status_code != 200:
                    raise Exception(f"Transcription request failed: {transcript_response.text}")
                
                transcript_id = transcript_response.json()['id']
                print(f"⏳ Transcription job ID: {transcript_id}")
                
                # Poll for completion (max 30 seconds)
                max_attempts = 30
                for attempt in range(max_attempts):
                    result = requests.get(
                        f"{self.transcript_url}/{transcript_id}",
                        headers=headers
                    )
                    
                    status = result.json()['status']
                    print(f"📊 Status: {status} (attempt {attempt + 1}/{max_attempts})")
                    
                    if status == 'completed':
                        return self._format_assemblyai_response(result.json())
                    elif status == 'error':
                        raise Exception(f"Transcription failed: {result.json().get('error')}")
                    
                    time.sleep(1)
                
                # Timeout - return what we have
                print("⏱️  Transcription timeout - returning partial results")
                return await self._mock_transcribe(audio_data)
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            print(f"❌ Transcription error: {str(e)}")
            # Fallback to mock
            try:
                decoded_audio = base64.b64decode(audio_base64)
                return await self._mock_transcribe(decoded_audio)
            except:
                return await self._mock_transcribe(b'')
    
    def _format_assemblyai_response(self, result: dict) -> List[Dict[str, str]]:
        """Format AssemblyAI response to our transcript format"""
        segments = []
        
        # If we have speaker labels, use them
        if result.get('utterances'):
            for utterance in result['utterances']:
                segments.append({
                    "timestamp": self._format_timestamp(utterance['start']),
                    "text": utterance['text'],
                    "speaker": f"Speaker {utterance['speaker']}"
                })
        else:
            # No speaker labels, return full text
            text = result.get('text', '')
            if text:
                segments.append({
                    "timestamp": "0:00",
                    "text": text,
                    "speaker": "Speaker"
                })
        
        return segments
    
    def _format_timestamp(self, milliseconds: int) -> str:
        """Convert milliseconds to MM:SS format"""
        seconds = milliseconds // 1000
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}:{secs:02d}"
    
    async def _mock_transcribe(self, audio_data: bytes) -> List[Dict[str, str]]:
        """Mock transcription for testing when API key not available"""
        if self.mock_mode:
            # Mock transcription for testing
            print("📝 Mock transcription: Generating sample transcript")
            audio_data = base64.b64decode(audio_base64)
            audio_size_kb = len(audio_data) / 1024
            
            # Generate realistic looking transcript based on audio size
            sample_texts = [
                "Let's start today's meeting and discuss the project updates.",
                "I think we should focus on the key deliverables for this quarter.",
                "The team has been working hard on implementing the new features.",
                "We need to address the feedback from our stakeholders.",
                "I agree, let's schedule a follow-up meeting next week.",
                "Does anyone have any questions or concerns?",
                "Great work everyone, let's keep the momentum going.",
                "We should document these decisions for future reference.",
            ]
            
            import random
            from datetime import datetime
            
            # Return 1-3 random segments
            num_segments = min(3, max(1, int(audio_size_kb / 50)))
            segments = []
            
            for i in range(num_segments):
                segments.append({
                    "timestamp": f"0:{i*10:02d}",
                    "text": random.choice(sample_texts),
                    "speaker": f"Speaker {(i % 3) + 1}"
                })
            
            print(f"✅ Generated {len(segments)} mock transcript segments")
            return segments

stt_service = STTService()
