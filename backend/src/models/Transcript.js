const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema({
  meeting: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Meeting',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  content: {
    type: String,
    required: true
  },
  segments: [{
    speaker: {
      name: String,
      id: String
    },
    text: {
      type: String,
      required: true
    },
    startTime: {
      type: Number, // in seconds
      required: true
    },
    endTime: {
      type: Number, // in seconds
      required: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    words: [{
      text: String,
      startTime: Number,
      endTime: Number,
      confidence: Number
    }]
  }],
  language: {
    code: {
      type: String,
      default: 'en-US'
    },
    name: {
      type: String,
      default: 'English (US)'
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  speakers: [{
    id: String,
    name: String,
    totalSpeakTime: Number, // in seconds
    segmentCount: Number,
    confidence: Number
  }],
  processingInfo: {
    service: {
      type: String,
      enum: ['assembly-ai', 'google-speech', 'aws-transcribe', 'azure-speech'],
      default: 'assembly-ai'
    },
    jobId: String,
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'queued'
    },
    processingTime: Number, // in milliseconds
    wordCount: Number,
    accuracy: Number,
    confidence: Number,
    error: String
  },
  features: {
    speakerDiarization: {
      type: Boolean,
      default: true
    },
    punctuation: {
      type: Boolean,
      default: true
    },
    profanityFilter: {
      type: Boolean,
      default: false
    },
    autoHighlights: {
      type: Boolean,
      default: true
    },
    sentimentAnalysis: {
      type: Boolean,
      default: true
    }
  },
  analytics: {
    sentimentScores: [{
      segment: Number, // segment index
      sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative']
      },
      score: {
        type: Number,
        min: -1,
        max: 1
      },
      confidence: Number
    }],
    topicsDetected: [String],
    keyPhrases: [{
      phrase: String,
      relevance: Number,
      frequency: Number
    }],
    speakingTime: [{
      speaker: String,
      totalTime: Number,
      percentage: Number
    }],
    pauseAnalysis: {
      totalPauses: Number,
      averagePauseLength: Number,
      longestPause: Number
    }
  },
  searchableText: String, // Processed text for full-text search
  isProcessed: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for performance and search
transcriptSchema.index({ meeting: 1 });
transcriptSchema.index({ user: 1, createdAt: -1 });
transcriptSchema.index({ 'processingInfo.status': 1 });
transcriptSchema.index({ 'segments.startTime': 1 });
transcriptSchema.index({ searchableText: 'text' }); // Full-text search

// Virtual for total duration
transcriptSchema.virtual('totalDuration').get(function() {
  if (!this.segments.length) return 0;
  const lastSegment = this.segments[this.segments.length - 1];
  return lastSegment.endTime;
});

// Virtual for formatted duration
transcriptSchema.virtual('formattedDuration').get(function() {
  const duration = this.totalDuration;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

// Method to get transcript at specific time
transcriptSchema.methods.getTranscriptAtTime = function(timeInSeconds) {
  return this.segments.filter(segment => 
    segment.startTime <= timeInSeconds && segment.endTime >= timeInSeconds
  );
};

// Method to search within transcript
transcriptSchema.methods.search = function(query, options = {}) {
  const regex = new RegExp(query, 'gi');
  const results = [];
  
  this.segments.forEach((segment, index) => {
    const matches = segment.text.match(regex);
    if (matches) {
      results.push({
        segmentIndex: index,
        segment: segment,
        matches: matches.length,
        context: this.getContext(index, options.contextLines || 2)
      });
    }
  });
  
  return results;
};

// Method to get context around a segment
transcriptSchema.methods.getContext = function(segmentIndex, contextLines = 2) {
  const start = Math.max(0, segmentIndex - contextLines);
  const end = Math.min(this.segments.length - 1, segmentIndex + contextLines);
  
  return this.segments.slice(start, end + 1).map(segment => ({
    speaker: segment.speaker,
    text: segment.text,
    startTime: segment.startTime,
    isTarget: this.segments.indexOf(segment) === segmentIndex
  }));
};

// Method to export as different formats
transcriptSchema.methods.exportAs = function(format = 'txt') {
  switch (format.toLowerCase()) {
    case 'txt':
      return this.segments
        .map(segment => `${segment.speaker?.name || 'Speaker'}: ${segment.text}`)
        .join('\n\n');
    
    case 'srt':
      return this.segments
        .map((segment, index) => {
          const start = this.formatTimeForSRT(segment.startTime);
          const end = this.formatTimeForSRT(segment.endTime);
          return `${index + 1}\n${start} --> ${end}\n${segment.text}\n`;
        })
        .join('\n');
    
    case 'vtt':
      let vtt = 'WEBVTT\n\n';
      vtt += this.segments
        .map(segment => {
          const start = this.formatTimeForVTT(segment.startTime);
          const end = this.formatTimeForVTT(segment.endTime);
          return `${start} --> ${end}\n${segment.text}\n`;
        })
        .join('\n');
      return vtt;
    
    default:
      return this.content;
  }
};

// Helper method to format time for SRT
transcriptSchema.methods.formatTimeForSRT = function(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
};

// Helper method to format time for VTT
transcriptSchema.methods.formatTimeForVTT = function(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.floor((seconds % 1) * 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
};

// Pre-save middleware to update searchable text
transcriptSchema.pre('save', function(next) {
  if (this.isModified('segments') || this.isModified('content')) {
    this.searchableText = this.segments
      .map(segment => segment.text)
      .join(' ')
      .toLowerCase();
    
    // Update word count
    this.processingInfo.wordCount = this.searchableText.split(/\s+/).length;
  }
  next();
});

module.exports = mongoose.model('Transcript', transcriptSchema);