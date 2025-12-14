import mongoose from 'mongoose';

const reactionSchema = new mongoose.Schema({
  emoji: {
    type: String,
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { _id: false });

const readBySchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  read_at: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'file', 'image', 'video', 'system'],
    default: 'text'
  },
  content: {
    type: String,
    trim: true
  },
  file_info: {
    file_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    filename: String,
    mime_type: String,
    size: Number,
    url: String
  },
  reply_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  thread_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  is_edited: {
    type: Boolean,
    default: false
  },
  reactions: [reactionSchema],
  read_by: [readBySchema],
  ai_summary: {
    type: String
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

messageSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

messageSchema.index({ conversation_id: 1, created_at: -1 });
messageSchema.index({ sender_id: 1 });

export default mongoose.model('Message', messageSchema);

