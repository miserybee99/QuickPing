import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  due_date: {
    type: Date,
    required: true,
    index: true
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

// Compound indexes for efficient queries
deadlineSchema.index({ conversation_id: 1, due_date: 1 });

// Virtual for overdue check
deadlineSchema.virtual('is_overdue').get(function() {
  return this.due_date < new Date();
});

// Ensure virtuals are included in JSON output
deadlineSchema.set('toJSON', { virtuals: true });
deadlineSchema.set('toObject', { virtuals: true });

// Pre-save hook to update updated_at
deadlineSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.model('Deadline', deadlineSchema);
