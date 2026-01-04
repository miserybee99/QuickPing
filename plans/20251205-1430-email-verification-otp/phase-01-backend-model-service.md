# Phase 1: Backend - OTP Model & Email Service

## Overview
Create the foundational backend components for the OTP verification system.

---

## Task 1.1: Create OTP Model

**File**: `backend/models/OTP.js`

### Schema Design

```javascript
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

// Static methods
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

otpSchema.statics.getExpiryTime = function() {
  const minutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
  return new Date(Date.now() + minutes * 60 * 1000);
};

export default mongoose.model('OTP', otpSchema);
```

### Key Features

- **TTL Index**: Automatically deletes expired OTPs
- **Attempt Tracking**: Prevents brute-force attacks
- **Type Field**: Extensible for password reset in future
- **Hash Storage**: OTPs are stored hashed, not plain text

---

## Task 1.2: Create Email Service

**File**: `backend/services/email.service.js`

### Implementation

```javascript
import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production SMTP
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  } else {
    // Development - use Ethereal (fake SMTP)
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.ETHEREAL_USER || 'dev@ethereal.email',
        pass: process.env.ETHEREAL_PASS || 'devpassword'
      }
    });
  }
};

const transporter = createTransporter();

// Generate OTP email HTML
const generateOTPEmailHTML = (username, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Xác thực Email - QuickPing</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                 background-color: #f5f5f5; margin: 0; padding: 20px;">
      <div style="max-width: 480px; margin: 0 auto; background: white; 
                  border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <!-- Logo -->
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #3b82f6; margin: 0; font-size: 28px;">💬 QuickPing</h1>
        </div>
        
        <!-- Greeting -->
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Xin chào <strong>${username}</strong>! 👋
        </p>
        
        <!-- Message -->
        <p style="font-size: 16px; color: #666; margin-bottom: 24px;">
          Cảm ơn bạn đã đăng ký tài khoản QuickPing. Đây là mã xác thực của bạn:
        </p>
        
        <!-- OTP Box -->
        <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); 
                    border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: bold; color: white; 
                       letter-spacing: 8px; font-family: monospace;">
            ${otp}
          </span>
        </div>
        
        <!-- Expiry Notice -->
        <p style="font-size: 14px; color: #888; text-align: center; margin-bottom: 24px;">
          ⏱️ Mã này sẽ hết hạn sau <strong>10 phút</strong>
        </p>
        
        <!-- Warning -->
        <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 14px; color: #92400e; margin: 0;">
            ⚠️ Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.
            Không chia sẻ mã này với bất kỳ ai.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
          <p style="font-size: 12px; color: #999; margin: 0;">
            © 2024 QuickPing. Kết nối mọi người.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send OTP email
export const sendOTPEmail = async (email, username, otp) => {
  try {
    const mailOptions = {
      from: `"QuickPing" <${process.env.SMTP_USER || 'noreply@quickping.app'}>`,
      to: email,
      subject: '🔐 [QuickPing] Mã xác thực email của bạn',
      html: generateOTPEmailHTML(username, otp),
      text: `Xin chào ${username}!\n\nMã xác thực của bạn là: ${otp}\n\nMã này sẽ hết hạn sau 10 phút.\n\n- QuickPing Team`
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('📧 Email sent:', info.messageId);
    
    // In development, log the preview URL (Ethereal)
    if (process.env.NODE_ENV !== 'production') {
      console.log('📬 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send email');
  }
};

// Verify transporter connection
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
};

export default {
  sendOTPEmail,
  verifyEmailConnection
};
```

### Key Features

- **Environment-based Config**: Different SMTP for dev/prod
- **Beautiful HTML Template**: Professional-looking email
- **Error Handling**: Graceful failure with logging
- **Development Mode**: Uses Ethereal for testing

---

## Task 1.3: Create Email Template (Optional Standalone)

**File**: `backend/templates/otp-email.html`

This is included in the email service, but can be extracted as a separate template file for easier editing.

---

## Environment Variables to Add

Add these to `backend/.env`:

```env
# Email Configuration (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Email Configuration (Development - Ethereal)
ETHEREAL_USER=
ETHEREAL_PASS=

# OTP Settings
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_RESEND_PER_HOUR=3
```

---

## Acceptance Criteria

- [ ] OTP model created with proper indexes
- [ ] Email service can send emails
- [ ] HTML email template is responsive and professional
- [ ] TTL index auto-deletes expired OTPs
- [ ] Development mode uses Ethereal for testing
- [ ] Environment variables documented

---

## Next Phase

→ **Phase 2**: Backend API Endpoints (auth routes modification)
