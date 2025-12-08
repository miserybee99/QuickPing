import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  otp_hash: {
    type: String,
    required: true
  },
  expires_at: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - auto-delete when expired
  },
  attempts: {
    type: Number,
    default: 0
  },
  is_used: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    enum: ['email_verification', 'password_reset'],
    default: 'email_verification'
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

// Indexes
otpSchema.index({ email: 1 });
otpSchema.index({ user_id: 1 });

// Pre-save middleware
otpSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

// Static method: Generate 6-digit OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method: Get expiry time (default 10 minutes)
otpSchema.statics.getExpiryTime = function() {
  const minutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

export default mongoose.model('OTP', otpSchema);
