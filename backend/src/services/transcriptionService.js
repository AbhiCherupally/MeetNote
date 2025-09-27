const { AssemblyAI } = require('assemblyai');
const WebSocket = require('ws');

class TranscriptionService {
  constructor() {
    this.apiKey = process.env.ASSEMBLYAI_API_KEY || process.env.ASSEMBLY_AI_KEY;
    this.client = null;
    this.activeTranscriptions = new Map();
    
    if (this.apiKey) {
      this.client = new AssemblyAI({ apiKey: this.apiKey });
      console.log('✅ AssemblyAI client initialized');
    } else {
      console.warn('⚠️ AssemblyAI API key not found - transcription will not work');
    }
  }

  /**
   * Start real-time transcription
   */
  async startRealtimeTranscription(meetingId, audioStream) {
    if (!this.client) {
      throw new Error('AssemblyAI not configured - missing API key');
    }

    try {
      console.log(`🎤 Starting real-time transcription for meeting ${meetingId}`);

      // Create real-time transcription session
      const realtimeTranscriber = this.client.realtime.transcriber({
        sampleRate: 16000,
        encoding: 'pcm_s16le'
      });

      // Store active transcription
      this.activeTranscriptions.set(meetingId, {
        transcriber: realtimeTranscriber,
        transcript: '',
        chunks: []
      });

      // Handle transcription events
      realtimeTranscriber.on('open', ({ sessionId }) => {
        console.log(`✅ Real-time transcription session opened: ${sessionId}`);
      });

      realtimeTranscriber.on('transcript', (transcript) => {
        console.log('📝 Transcript received:', transcript.text);
        
        const transcriptionData = this.activeTranscriptions.get(meetingId);
        if (transcriptionData) {
          // Update stored transcript
          if (transcript.message_type === 'FinalTranscript') {
            transcriptionData.transcript += transcript.text + ' ';
            transcriptionData.chunks.push({
              text: transcript.text,
              timestamp: Date.now(),
              confidence: transcript.confidence,
              speaker: this.identifySpeaker(transcript)
            });
          }

          // Return real-time update
          return {
            meetingId,
            type: transcript.message_type,
            text: transcript.text,
            confidence: transcript.confidence,
            timestamp: Date.now(),
            speaker: this.identifySpeaker(transcript)
          };
        }
      });

      realtimeTranscriber.on('error', (error) => {
        console.error('❌ Transcription error:', error);
        this.stopRealtimeTranscription(meetingId);
      });

      realtimeTranscriber.on('close', (code, reason) => {
        console.log(`🔌 Transcription session closed: ${code} - ${reason}`);
        this.activeTranscriptions.delete(meetingId);
      });

      // Connect to AssemblyAI
      await realtimeTranscriber.connect();

      return realtimeTranscriber;

    } catch (error) {
      console.error('❌ Failed to start real-time transcription:', error);
      throw error;
    }
  }

  /**
   * Stop real-time transcription
   */
  async stopRealtimeTranscription(meetingId) {
    const transcriptionData = this.activeTranscriptions.get(meetingId);
    
    if (transcriptionData) {
      console.log(`⏹️ Stopping transcription for meeting ${meetingId}`);
      
      try {
        await transcriptionData.transcriber.close();
        
        // Return final transcript
        const finalTranscript = {
          meetingId,
          fullTranscript: transcriptionData.transcript.trim(),
          chunks: transcriptionData.chunks,
          duration: transcriptionData.chunks.length > 0 ? 
            transcriptionData.chunks[transcriptionData.chunks.length - 1].timestamp - 
            transcriptionData.chunks[0].timestamp : 0
        };

        this.activeTranscriptions.delete(meetingId);
        
        return finalTranscript;
        
      } catch (error) {
        console.error('❌ Error stopping transcription:', error);
        this.activeTranscriptions.delete(meetingId);
        throw error;
      }
    }
    
    return null;
  }

  /**
   * Send audio data to transcription
   */
  async sendAudioData(meetingId, audioBuffer) {
    const transcriptionData = this.activeTranscriptions.get(meetingId);
    
    if (transcriptionData && transcriptionData.transcriber) {
      try {
        transcriptionData.transcriber.sendAudio(audioBuffer);
      } catch (error) {
        console.error('❌ Error sending audio data:', error);
      }
    }
  }

  /**
   * Process uploaded audio file
   */
  async transcribeAudioFile(audioUrl, options = {}) {
    if (!this.client) {
      throw new Error('AssemblyAI not configured');
    }

    try {
      console.log('🎤 Transcribing audio file:', audioUrl);

      const config = {
        audio_url: audioUrl,
        speaker_labels: true,
        auto_chapters: true,
        sentiment_analysis: true,
        entity_detection: true,
        iab_categories: true,
        content_safety: true,
        ...options
      };

      const transcript = await this.client.transcripts.create(config);
      
      // Wait for completion
      let completedTranscript = transcript;
      while (completedTranscript.status !== 'completed' && completedTranscript.status !== 'error') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        completedTranscript = await this.client.transcripts.get(transcript.id);
        console.log(`📝 Transcription status: ${completedTranscript.status}`);
      }

      if (completedTranscript.status === 'error') {
        throw new Error(`Transcription failed: ${completedTranscript.error}`);
      }

      console.log('✅ Transcription completed');
      
      return {
        id: completedTranscript.id,
        text: completedTranscript.text,
        confidence: completedTranscript.confidence,
        chapters: completedTranscript.chapters,
        sentiment_analysis: completedTranscript.sentiment_analysis_results,
        entities: completedTranscript.entities,
        speakers: this.extractSpeakers(completedTranscript),
        duration: completedTranscript.audio_duration * 1000 // Convert to ms
      };

    } catch (error) {
      console.error('❌ Audio transcription failed:', error);
      throw error;
    }
  }

  /**
   * Generate summary from transcript
   */
  async generateSummary(transcript, options = {}) {
    if (!this.client) {
      throw new Error('AssemblyAI not configured');
    }

    try {
      console.log('📊 Generating summary from transcript...');

      const summaryResponse = await this.client.lemur.summary({
        transcript_ids: [transcript.id],
        answer_format: options.format || 'paragraph',
        final_model: options.model || 'default'
      });

      return {
        summary: summaryResponse.response,
        request_id: summaryResponse.request_id
      };

    } catch (error) {
      console.error('❌ Summary generation failed:', error);
      throw error;
    }
  }

  /**
   * Extract action items from transcript
   */
  async extractActionItems(transcript) {
    if (!this.client) {
      throw new Error('AssemblyAI not configured');
    }

    try {
      console.log('📋 Extracting action items...');

      const actionItemsResponse = await this.client.lemur.actionItems({
        transcript_ids: [transcript.id]
      });

      return {
        actionItems: actionItemsResponse.response,
        request_id: actionItemsResponse.request_id
      };

    } catch (error) {
      console.error('❌ Action items extraction failed:', error);
      throw error;
    }
  }

  /**
   * Helper: Identify speaker from transcript
   */
  identifySpeaker(transcript) {
    if (transcript.words && transcript.words.length > 0 && transcript.words[0].speaker) {
      return `Speaker ${transcript.words[0].speaker}`;
    }
    return 'Unknown Speaker';
  }

  /**
   * Helper: Extract speakers from completed transcript
   */
  extractSpeakers(transcript) {
    const speakers = new Set();
    
    if (transcript.utterances) {
      transcript.utterances.forEach(utterance => {
        if (utterance.speaker) {
          speakers.add(`Speaker ${utterance.speaker}`);
        }
      });
    }
    
    return Array.from(speakers);
  }

  /**
   * Get active transcriptions count
   */
  getActiveTranscriptionsCount() {
    return this.activeTranscriptions.size;
  }

  /**
   * Check if transcription is active for meeting
   */
  isTranscriptionActive(meetingId) {
    return this.activeTranscriptions.has(meetingId);
  }
}

module.exports = new TranscriptionService();