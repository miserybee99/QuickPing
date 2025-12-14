import mongoose from 'mongoose';

const participantSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'moderator', 'member'],
    default: 'member'
  }
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['direct', 'group'],
    required: true
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  avatar_url: {
    type: String,
    default: null
  },
  participants: [participantSchema],
  settings: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  pinned_messages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  last_message: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

conversationSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.model('Conversation', conversationSchema);

