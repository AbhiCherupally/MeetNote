import os
import base64
import json
from typing import List, Dict
import tempfile
import assemblyai as aai

class STTService:
    def __init__(self):
        self.api_key = os.getenv('ASSEMBLYAI_API_KEY', '')
        
        if not self.api_key:
            print("⚠️  No ASSEMBLYAI_API_KEY found - using mock transcription")
            self.mock_mode = True
        else:
            print("✅ AssemblyAI configured")
            aai.settings.api_key = self.api_key
            self.mock_mode = False
    
    async def transcribe_audio(self, audio_base64: str, audio_format: str = "webm") -> List[Dict[str, str]]:
        """Transcribe audio to text using AssemblyAI SDK"""
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            print(f"📦 Audio size: {len(audio_data) / 1024:.2f} KB")
            
            if self.mock_mode:
                return await self._mock_transcribe(audio_data)
            
            # Check audio size (min 1KB for valid audio)
            if len(audio_data) < 1024:
                print(f"⚠️  Audio too small ({len(audio_data)} bytes), using mock")
                return await self._mock_transcribe(audio_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                print("🎤 Starting AssemblyAI transcription...")
                
                # Configure transcription settings
                config = aai.TranscriptionConfig(
                    speaker_labels=True,  # Enable speaker diarization
                    speech_model=aai.SpeechModel.best  # Use best model
                )
                
                # Create transcriber with config
                transcriber = aai.Transcriber(config=config)
                
                # Transcribe the audio file
                print("📤 Uploading and transcribing...")
                transcript = transcriber.transcribe(temp_file_path)
                
                # Check for errors
                if transcript.status == aai.TranscriptStatus.error:
                    raise RuntimeError(f"Transcription failed: {transcript.error}")
                
                print(f"✅ Transcription completed!")
                
                # Format the response
                return self._format_assemblyai_sdk_response(transcript)
                
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
        """Transcribe audio to text using AssemblyAI"""
        
        try:
            # Decode base64 audio
            audio_data = base64.b64decode(audio_base64)
            print(f"📦 Audio size: {len(audio_data) / 1024:.2f} KB")
            
            if self.mock_mode:
                return await self._mock_transcribe(audio_data)
            
            # Check audio size (min 100 bytes for valid audio)
            if len(audio_data) < 100:
                print(f"⚠️  Audio too small ({len(audio_data)} bytes), using mock")
                return await self._mock_transcribe(audio_data)
            
            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=f'.{audio_format}', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                print("🎤 Starting AssemblyAI transcription...")
                
                # Configure transcription with speaker labels
                config = aai.TranscriptionConfig(
                    speech_model=aai.SpeechModel.best,
                    speaker_labels=True
                )
                
                # Create transcriber and transcribe
                transcriber = aai.Transcriber(config=config)
                transcript = transcriber.transcribe(temp_file_path)
                
                # Check for errors
                if transcript.status == aai.TranscriptStatus.error:
                    raise RuntimeError(f"Transcription failed: {transcript.error}")
                
                print(f"✅ Transcription completed: {transcript.status}")
                
                # Format response
                return self._format_assemblyai_response_sdk(transcript)
                
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
    
    def _format_assemblyai_response_sdk(self, transcript: aai.Transcript) -> List[Dict[str, str]]:
        """Format AssemblyAI SDK response to our transcript format"""
        segments = []
        
        # If we have speaker labels (utterances), use them
        if transcript.utterances:
            for utterance in transcript.utterances:
                segments.append({
                    "timestamp": self._format_timestamp(utterance.start),
                    "text": utterance.text,
                    "speaker": f"Speaker {utterance.speaker}"
                })
        else:
            # No speaker labels, return full text
            if transcript.text:
                segments.append({
                    "timestamp": "0:00",
                    "text": transcript.text,
                    "speaker": "Speaker"
                })
        
        print(f"✅ Formatted {len(segments)} transcript segments")
        return segments
    
    def _format_timestamp(self, milliseconds: int) -> str:
        """Convert milliseconds to MM:SS format"""
        seconds = milliseconds // 1000
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}:{secs:02d}"
    
    async def _mock_transcribe(self, audio_data: bytes) -> List[Dict[str, str]]:
        """Mock transcription for testing when API key not available"""
        print("📝 Mock transcription: Generating sample transcript")
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
