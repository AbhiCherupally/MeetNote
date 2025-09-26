const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  platform: {
    type: String,
    enum: ['zoom', 'google-meet', 'teams', 'webex', 'other'],
    required: true
  },
  meetingUrl: {
    type: String,
    trim: true
  },
  meetingId: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'recording', 'processing', 'completed', 'failed'],
    default: 'scheduled'
  },
  recordingStatus: {
    type: String,
    enum: ['not-started', 'recording', 'stopped', 'processing', 'completed', 'failed'],
    default: 'not-started'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  participants: [{
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      lowercase: true
    },
    role: {
      type: String,
      enum: ['host', 'participant', 'guest'],
      default: 'participant'
    },
    joinTime: Date,
    leaveTime: Date
  }],
  recording: {
    videoUrl: String,
    audioUrl: String,
    size: Number, // in bytes
    format: String,
    quality: {
      type: String,
      enum: ['low', 'medium', 'high', 'hd'],
      default: 'medium'
    }
  },
  transcript: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transcript'
  },
  highlights: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Highlight'
  }],
  aiInsights: {
    summary: {
      executive: String,
      keyPoints: [String],
      decisions: [String],
      nextSteps: [String]
    },
    actionItems: [{
      task: String,
      assignee: String,
      dueDate: Date,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
      },
      status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
      }
    }],
    sentiment: {
      overall: {
        type: String,
        enum: ['positive', 'neutral', 'negative']
      },
      engagement: {
        type: String,
        enum: ['high', 'medium', 'low']
      },
      score: {
        type: Number,
        min: 0,
        max: 100
      }
    },
    topics: [String],
    keywords: [String]
  },
  sharing: {
    isPublic: {
      type: Boolean,
      default: false
    },
    shareToken: String,
    sharedWith: [{
      email: String,
      permissions: {
        type: String,
        enum: ['view', 'comment', 'edit'],
        default: 'view'
      },
      sharedAt: {
        type: Date,
        default: Date.now
      }
    }],
    integrations: {
      slack: {
        channelId: String,
        messageId: String,
        shared: Boolean
      },
      hubspot: {
        contactId: String,
        dealId: String,
        shared: Boolean
      },
      salesforce: {
        opportunityId: String,
        accountId: String,
        shared: Boolean
      }
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['extension', 'web', 'api', 'webhook'],
      default: 'extension'
    },
    browserInfo: {
      userAgent: String,
      platform: String,
      language: String
    },
    extensionVersion: String,
    processingTime: Number, // in milliseconds
    fileSize: Number,
    audioQuality: {
      sampleRate: Number,
      bitRate: Number,
      channels: Number
    }
  },
  settings: {
    autoTranscribe: {
      type: Boolean,
      default: true
    },
    autoHighlight: {
      type: Boolean,
      default: true
    },
    speakerDiarization: {
      type: Boolean,
      default: true
    },
    language: {
      type: String,
      default: 'en-US'
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
meetingSchema.index({ user: 1, createdAt: -1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ startTime: 1 });
meetingSchema.index({ 'sharing.shareToken': 1 });
meetingSchema.index({ 'participants.email': 1 });
meetingSchema.index({ platform: 1 });

// Virtual for formatted duration
meetingSchema.virtual('formattedDuration').get(function() {
  if (!this.duration) return '0m';
  
  const hours = Math.floor(this.duration / 60);
  const minutes = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

// Virtual for participant count
meetingSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

// Method to check if user has access
meetingSchema.methods.hasAccess = function(userId) {
  return this.user.toString() === userId.toString() ||
         this.sharing.sharedWith.some(share => share.userId && share.userId.toString() === userId.toString()) ||
         this.sharing.isPublic;
};

// Method to get recording URL with expiry
meetingSchema.methods.getRecordingUrl = function(type = 'video') {
  // This would typically generate a signed URL for cloud storage
  return type === 'video' ? this.recording.videoUrl : this.recording.audioUrl;
};

// Pre-save middleware
meetingSchema.pre('save', function(next) {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

// Soft delete method
meetingSchema.methods.softDelete = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Meeting', meetingSchema);