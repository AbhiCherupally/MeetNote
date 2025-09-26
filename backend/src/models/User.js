const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.zoomId;
    },
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    },
    stripeCustomerId: String,
    subscriptionId: String,
    currentPeriodEnd: Date
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: {
        type: Boolean,
        default: true
      },
      desktop: {
        type: Boolean,
        default: true
      },
      meetingReminders: {
        type: Boolean,
        default: true
      }
    },
    transcription: {
      language: {
        type: String,
        default: 'en-US'
      },
      autoHighlight: {
        type: Boolean,
        default: true
      },
      speakerLabels: {
        type: Boolean,
        default: true
      }
    }
  },
  integrations: {
    google: {
      id: String,
      accessToken: String,
      refreshToken: String,
      connected: {
        type: Boolean,
        default: false
      }
    },
    zoom: {
      id: String,
      accessToken: String,
      refreshToken: String,
      connected: {
        type: Boolean,
        default: false
      }
    },
    slack: {
      teamId: String,
      userId: String,
      accessToken: String,
      connected: {
        type: Boolean,
        default: false
      }
    },
    hubspot: {
      accessToken: String,
      refreshToken: String,
      connected: {
        type: Boolean,
        default: false
      }
    }
  },
  extensionSettings: {
    autoRecord: {
      type: Boolean,
      default: false
    },
    overlayPosition: {
      type: String,
      enum: ['top-right', 'top-left', 'bottom-right', 'bottom-left'],
      default: 'bottom-right'
    },
    keyboardShortcuts: {
      toggleRecording: {
        type: String,
        default: 'Alt+R'
      },
      createHighlight: {
        type: String,
        default: 'Alt+H'
      }
    }
  },
  usage: {
    meetingsRecorded: {
      type: Number,
      default: 0
    },
    transcriptionMinutes: {
      type: Number,
      default: 0
    },
    highlightsCreated: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  passwordResetToken: String,
  passwordResetExpires: Date,
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'integrations.google.id': 1 });
userSchema.index({ 'integrations.zoom.id': 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Method to check if user has active subscription
userSchema.methods.hasActivePlan = function(requiredPlan = 'pro') {
  const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
  return planHierarchy[this.subscription.plan] >= planHierarchy[requiredPlan] &&
         this.subscription.status === 'active';
};

module.exports = mongoose.model('User', userSchema);