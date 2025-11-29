const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // HubSpot identifiers
  hubspotId: {
    type: String,
    index: true
  },
  objectId: {
    type: String,
    index: true
  },

  // Contact information
  email: {
    type: String,
    index: true
  },
  phone: {
    type: String
  },
  mobilePhone: {
    type: String
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  projectName: {
    type: String
  },

  // HubSpot metadata
  leadStatus: {
    type: String
  },
  lifecycleStage: {
    type: String
  },

  // Processing status
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'closed', 'failed'],
    default: 'new',
    index: true
  },
  
  // Call tracking
  callStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'voicemail'],
    default: 'pending'
  },
  callAttempts: {
    type: Number,
    default: 0
  },
  lastCallAt: {
    type: Date
  },
  callNotes: {
    type: String
  },

  // Source tracking
  source: {
    type: String,
    enum: ['hubspot_webhook', 'hubspot_api', 'manual', 'import'],
    default: 'hubspot_webhook'
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },

  // Store raw data for reference
  rawData: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: false
});

// Indexes
leadSchema.index({ source: 1, updatedAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });

// Virtual for full name
leadSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || 'Unknown';
});

// Virtual for best phone number
leadSchema.virtual('bestPhone').get(function() {
  return this.mobilePhone || this.phone || null;
});

// Method to mark as contacted
leadSchema.methods.markAsContacted = function() {
  this.status = 'contacted';
  this.processedAt = new Date();
  this.callAttempts += 1;
  this.lastCallAt = new Date();
  return this.save();
};

// Static method to get unprocessed leads
leadSchema.statics.getUnprocessedLeads = function(limit = 50) {
  return this.find({ 
    status: 'new',
    $or: [
      { phone: { $exists: true, $ne: '' } },
      { mobilePhone: { $exists: true, $ne: '' } }
    ]
  })
  .sort({ createdAt: 1 })
  .limit(limit);
};

// Static method to get leads by status
leadSchema.statics.getLeadsByStatus = function(status, limit = 50) {
  return this.find({ status })
    .sort({ updatedAt: -1 })
    .limit(limit);
};

// Static method to get lead stats
leadSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const total = await this.countDocuments();
  const today = await this.countDocuments({
    createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
  });

  return {
    total,
    today,
    byStatus: stats.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {})
  };
};

leadSchema.set('toJSON', { virtuals: true });
leadSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Lead', leadSchema);
