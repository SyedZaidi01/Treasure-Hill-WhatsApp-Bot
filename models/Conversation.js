const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: true,
    index: true
  },
  userName: {
    type: String,
    default: 'Unknown User'
  },
  messages: [messageSchema],
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  metadata: {
    totalMessages: {
      type: Number,
      default: 0
    },
    firstContactAt: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Update lastMessageAt before saving
conversationSchema.pre('save', function(next) {
  if (this.messages.length > 0) {
    this.lastMessageAt = this.messages[this.messages.length - 1].timestamp;
    this.metadata.totalMessages = this.messages.length;
  }
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);
