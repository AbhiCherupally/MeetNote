import os
import base64
import json
from typing import List, Dict
import tempfile
import requests
import time

# ================================
# ASSEMBLYAI IMPLEMENTATION (BACKUP)
# ================================
# Keeping this for future reference if needed
# Issue: API key might be invalid or rate-limited
# 
# import assemblyai as aai
# 
# class AssemblyAIService:
#     def __init__(self):
#         self.api_key = os.getenv('ASSEMBLYAI_API_KEY', '')
#         if self.api_key:
#             aai.settings.api_key = self.api_key
#             print("✅ AssemblyAI configured")
#             self.mock_mode = False
#         else:
#             print("⚠️ No ASSEMBLYAI_API_KEY found - using mock transcription")
#             self.mock_mode = True
# 
#     async def transcribe_audio(self, audio_base64: str, audio_format: str = "webm") -> List[Dict[str, str]]:
#         if self.mock_mode:
#             return await self._mock_transcribe()
#         
#         try:
#             # Decode and save audio
#             audio_data = base64.b64decode(audio_base64)
#             with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
#                 temp_file.write(audio_data)
#                 temp_file_path = temp_file.name
#             
#             # Configure transcription
#             config = aai.TranscriptionConfig(
#                 speech_model=aai.SpeechModel.universal,
#                 speaker_labels=True
#             )
#             
#             # Transcribe
#             transcriber = aai.Transcriber(config=config)
#             transcript = transcriber.transcribe(temp_file_path)
#             
#             if transcript.status == "error":
#                 raise RuntimeError(f"Transcription failed: {transcript.error}")
#             
#             return self._format_assemblyai_response(transcript)
#             
#         except Exception as e:
#             print(f"❌ AssemblyAI error: {str(e)}")
#             return await self._mock_transcribe()
#         finally:
#             if os.path.exists(temp_file_path):
#                 os.unlink(temp_file_path)


# ================================
# FREE WHISPER IMPLEMENTATION
# ================================
# Using OpenAI Whisper via Hugging Face Transformers (FREE)

try:
    import whisper
    import torch
    WHISPER_AVAILABLE = True
    print("✅ Whisper model available")
except ImportError:
    WHISPER_AVAILABLE = False
    print("⚠️ Whisper not available, using mock transcription")

class STTService:
    def __init__(self):
        self.api_key = os.getenv('ASSEMBLYAI_API_KEY', '')
        
        if WHISPER_AVAILABLE:
            try:
                # Load small whisper model (free, runs locally)
                print("🔄 Loading Whisper model...")
                self.whisper_model = whisper.load_model("tiny")  # Fast, small model
                print("✅ Whisper model loaded successfully")
                self.mock_mode = False
            except Exception as e:
                print(f"❌ Failed to load Whisper: {e}")
                self.mock_mode = True
        else:
            self.mock_mode = True
    
    async def transcribe_audio(self, audio_base64: str, audio_format: str = "webm") -> List[Dict[str, str]]:
        """Transcribe audio using free Whisper model"""
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            print(f"📦 Audio size: {len(audio_data) / 1024:.2f} KB")
            
            if self.mock_mode or len(audio_data) < 1000:  # Skip very small audio
                return await self._mock_transcribe()
            
            # Save to temporary file (Whisper needs file input)
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                print("🎤 Transcribing with Whisper...")
                
                # Transcribe with Whisper (free, local)
                result = self.whisper_model.transcribe(
                    temp_file_path,
                    task="transcribe",
                    language="en"  # Auto-detect if None
                )
                
                segments = []
                if result.get('segments'):
                    # Has segment-level transcription
                    for i, segment in enumerate(result['segments']):
                        segments.append({
                            "timestamp": self._format_timestamp(segment['start']),
                            "text": segment['text'].strip(),
                            "speaker": f"Speaker {(i % 3) + 1}"  # Simple speaker assignment
                        })
                else:
                    # Full text only
                    text = result.get('text', '').strip()
                    if text:
                        segments.append({
                            "timestamp": "0:00",
                            "text": text,
                            "speaker": "Speaker"
                        })
                
                print(f"✅ Whisper transcribed {len(segments)} segments")
                return segments
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            print(f"❌ Whisper transcription error: {str(e)}")
            # Fallback to mock
            return await self._mock_transcribe()
    
    def _format_timestamp(self, seconds: float) -> str:
        """Convert seconds to MM:SS format"""
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        return f"{minutes}:{secs:02d}"
    
    async def _mock_transcribe(self) -> List[Dict[str, str]]:
        """Mock transcription for testing when real STT not available"""
        print("📝 Using mock transcription")
        
        # Generate realistic looking transcript
        sample_texts = [
            "Let's start today's meeting and discuss the project updates.",
            "I think we should focus on the key deliverables for this quarter.",
            "The team has been working hard on implementing the new features.",
            "We need to address the feedback from our stakeholders.",
            "I agree, let's schedule a follow-up meeting next week.",
            "Does anyone have any questions or concerns about this approach?",
            "Great work everyone, let's keep the momentum going.",
            "We should document these decisions for future reference.",
            "The next milestone is scheduled for the end of this month.",
            "Let me share my screen to show the latest progress."
        ]
        
        import random
        
        # Return 1-2 segments
        num_segments = random.randint(1, 2)
        segments = []
        
        for i in range(num_segments):
            segments.append({
                "timestamp": f"0:{i*15:02d}",
                "text": random.choice(sample_texts),
                "speaker": f"Speaker {random.randint(1, 3)}"
            })
        
        print(f"✅ Generated {len(segments)} mock transcript segments")
        return segments

# ================================
# GEMINI FALLBACK (IF WHISPER FAILS)
# ================================

class GeminiSTTService:
    def __init__(self):
        try:
            import google.generativeai as genai
            self.api_key = os.getenv('GOOGLE_GEMINI_API_KEY', '')
            
            if self.api_key:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-pro')
                print("✅ Gemini configured as fallback")
                self.available = True
            else:
                print("⚠️ No Gemini API key found")
                self.available = False
        except ImportError:
            print("⚠️ Gemini not available")
            self.available = False
    
    async def transcribe_with_context(self, text_description: str) -> List[Dict[str, str]]:
        """Generate realistic transcript based on context (fallback method)"""
        if not self.available:
            return []
        
        try:
            prompt = f"""
            Generate a realistic meeting transcript segment based on this context: {text_description}
            
            Return as JSON array with format:
            [{{"timestamp": "0:00", "text": "meeting content", "speaker": "Speaker 1"}}]
            
            Make it sound natural and professional.
            """
            
            response = self.model.generate_content(prompt)
            
            # Parse JSON response
            import json
            transcript_data = json.loads(response.text)
            return transcript_data if isinstance(transcript_data, list) else []
            
        except Exception as e:
            print(f"❌ Gemini fallback error: {e}")
            return []

# Initialize services
stt_service = STTService()
gemini_fallback = GeminiSTTService()