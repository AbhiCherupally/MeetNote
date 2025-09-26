const axios = require('axios');
const fs = require('fs');

class AssemblyAIService {
  constructor() {
    this.apiKey = process.env.ASSEMBLY_AI_KEY;
    this.baseUrl = 'https://api.assemblyai.com/v2';
    
    if (!this.apiKey) {
      throw new Error('Assembly AI API key is required');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Upload audio file to Assembly AI
   */
  async uploadAudio(audioBuffer, filename) {
    try {
      const uploadResponse = await axios.post('https://api.assemblyai.com/v2/upload', audioBuffer, {
        headers: {
          'Authorization': this.apiKey,
          'Content-Type': 'application/octet-stream'
        }
      });

      return uploadResponse.data.upload_url;
    } catch (error) {
      console.error('Failed to upload audio:', error.response?.data || error.message);
      throw new Error('Failed to upload audio file');
    }
  }

  /**
   * Start transcription job
   */
  async startTranscription(audioUrl, options = {}) {
    try {
      const transcriptConfig = {
        audio_url: audioUrl,
        speaker_labels: options.speakerDiarization !== false,
        auto_highlights: options.autoHighlights !== false,
        sentiment_analysis: options.sentimentAnalysis !== false,
        entity_detection: options.entityDetection !== false,
        punctuate: true,
        format_text: true,
        language_code: options.language || 'en_us',
        ...options
      };

      const response = await this.client.post('/transcript', transcriptConfig);
      return response.data;
    } catch (error) {
      console.error('Failed to start transcription:', error.response?.data || error.message);
      throw new Error('Failed to start transcription');
    }
  }

  /**
   * Get transcription status and result
   */
  async getTranscription(transcriptId) {
    try {
      const response = await this.client.get(`/transcript/${transcriptId}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get transcription:', error.response?.data || error.message);
      throw new Error('Failed to get transcription');
    }
  }

  /**
   * Poll for transcription completion
   */
  async waitForTranscription(transcriptId, maxWaitTime = 300000) { // 5 minutes max
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const result = await this.getTranscription(transcriptId);
      
      if (result.status === 'completed') {
        return result;
      } else if (result.status === 'error') {
        throw new Error(`Transcription failed: ${result.error}`);
      }
      
      // Wait 5 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Transcription timeout');
  }

  /**
   * Real-time transcription setup
   */
  async setupRealtimeTranscription(options = {}) {
    try {
      const config = {
        sample_rate: options.sampleRate || 16000,
        word_boost: options.wordBoost || [],
        encoding: options.encoding || 'pcm_s16le',
        ...options
      };

      const response = await this.client.post('/realtime/token', config);
      return response.data;
    } catch (error) {
      console.error('Failed to setup realtime transcription:', error.response?.data || error.message);
      throw new Error('Failed to setup realtime transcription');
    }
  }

  /**
   * Process transcription for MeetNote format
   */
  processTranscriptForMeetNote(assemblyResult) {
    const segments = [];
    let currentSegment = null;

    // Process utterances (speaker segments)
    if (assemblyResult.utterances) {
      assemblyResult.utterances.forEach((utterance, index) => {
        segments.push({
          speaker: {
            name: `Speaker ${utterance.speaker}`,
            id: utterance.speaker
          },
          text: utterance.text,
          startTime: utterance.start / 1000, // Convert ms to seconds
          endTime: utterance.end / 1000,
          confidence: utterance.confidence,
          words: utterance.words?.map(word => ({
            text: word.text,
            startTime: word.start / 1000,
            endTime: word.end / 1000,
            confidence: word.confidence
          })) || []
        });
      });
    } else {
      // Fallback: create segments from words if no speaker diarization
      const words = assemblyResult.words || [];
      const segmentDuration = 30; // 30 second segments
      
      words.forEach((word, index) => {
        const segmentStartTime = Math.floor(word.start / 1000 / segmentDuration) * segmentDuration;
        
        if (!currentSegment || currentSegment.startTime !== segmentStartTime) {
          if (currentSegment) segments.push(currentSegment);
          
          currentSegment = {
            speaker: { name: 'Speaker 1', id: 'speaker_1' },
            text: '',
            startTime: segmentStartTime,
            endTime: segmentStartTime + segmentDuration,
            confidence: 0,
            words: []
          };
        }
        
        currentSegment.text += (currentSegment.text ? ' ' : '') + word.text;
        currentSegment.words.push({
          text: word.text,
          startTime: word.start / 1000,
          endTime: word.end / 1000,
          confidence: word.confidence
        });
        currentSegment.confidence = Math.max(currentSegment.confidence, word.confidence);
        currentSegment.endTime = word.end / 1000;
      });
      
      if (currentSegment) segments.push(currentSegment);
    }

    // Process highlights if available
    const highlights = [];
    if (assemblyResult.auto_highlights_result?.results) {
      assemblyResult.auto_highlights_result.results.forEach(highlight => {
        highlights.push({
          text: highlight.text,
          startTime: highlight.start / 1000,
          endTime: highlight.end / 1000,
          rank: highlight.rank,
          relevance: highlight.relevance_score
        });
      });
    }

    // Process sentiment analysis
    const sentimentScores = [];
    if (assemblyResult.sentiment_analysis_results) {
      assemblyResult.sentiment_analysis_results.forEach((sentiment, index) => {
        sentimentScores.push({
          segment: index,
          sentiment: sentiment.sentiment,
          score: sentiment.confidence,
          confidence: sentiment.confidence
        });
      });
    }

    return {
      content: assemblyResult.text,
      segments,
      language: {
        code: assemblyResult.language_code || 'en_us',
        confidence: assemblyResult.confidence
      },
      processingInfo: {
        service: 'assembly-ai',
        jobId: assemblyResult.id,
        status: 'completed',
        accuracy: assemblyResult.confidence,
        confidence: assemblyResult.confidence,
        wordCount: assemblyResult.words?.length || 0
      },
      analytics: {
        sentimentScores,
        autoHighlights: highlights
      }
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return [
      { code: 'en_us', name: 'English (US)' },
      { code: 'en_au', name: 'English (Australia)' },
      { code: 'en_uk', name: 'English (UK)' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'nl', name: 'Dutch' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ja', name: 'Japanese' }
    ];
  }

  /**
   * Estimate transcription cost
   */
  estimateCost(durationMinutes, features = {}) {
    const baseCostPerMinute = 0.00065; // $0.00065 per minute
    let totalCost = durationMinutes * baseCostPerMinute;

    // Additional feature costs
    if (features.speakerDiarization) totalCost += durationMinutes * 0.00065;
    if (features.autoHighlights) totalCost += durationMinutes * 0.00065;
    if (features.sentimentAnalysis) totalCost += durationMinutes * 0.00065;

    return {
      baseCost: durationMinutes * baseCostPerMinute,
      totalCost,
      breakdown: {
        transcription: durationMinutes * baseCostPerMinute,
        speakerDiarization: features.speakerDiarization ? durationMinutes * 0.00065 : 0,
        autoHighlights: features.autoHighlights ? durationMinutes * 0.00065 : 0,
        sentimentAnalysis: features.sentimentAnalysis ? durationMinutes * 0.00065 : 0
      }
    };
  }
}

module.exports = new AssemblyAIService();