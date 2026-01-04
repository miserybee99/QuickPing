# Phase 2: Backend - API Endpoints

## Overview
Add OTP verification endpoints to the authentication routes and modify the registration flow.

---

## Task 2.1: Add OTP Endpoints to Auth Routes

**File**: `backend/routes/auth.js`

### New Endpoints

#### 1. Send OTP Endpoint

```javascript
// POST /auth/send-otp
// Send or resend OTP to user's email
router.post('/send-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này' });
    }

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email đã được xác thực' });
    }

    // Rate limiting: Check resend count in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      email: normalizedEmail,
      created_at: { $gte: oneHourAgo }
    });

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 3;
    if (recentOTPs >= maxResend) {
      return res.status(429).json({ 
        error: `Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau 1 giờ.`,
        retryAfter: 3600
      });
    }

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Generate new OTP
    const otp = OTP.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP
    const otpDoc = new OTP({
      user_id: user._id,
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: OTP.getExpiryTime()
    });
    await otpDoc.save();

    // Send email
    await sendOTPEmail(normalizedEmail, user.username, otp);

    res.json({ 
      message: 'Mã xác thực đã được gửi đến email của bạn',
      email: normalizedEmail,
      expiresIn: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Không thể gửi mã xác thực. Vui lòng thử lại.' });
  }
});
```

#### 2. Verify OTP Endpoint

```javascript
// POST /auth/verify-otp
// Verify OTP and mark user as verified
router.post('/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find the OTP record
    const otpDoc = await OTP.findOne({
      email: normalizedEmail,
      is_used: false,
      expires_at: { $gt: new Date() }
    });

    if (!otpDoc) {
      return res.status(400).json({ error: 'Mã xác thực không hợp lệ hoặc đã hết hạn' });
    }

    // Check attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
    if (otpDoc.attempts >= maxAttempts) {
      return res.status(429).json({ 
        error: 'Đã vượt quá số lần thử. Vui lòng yêu cầu mã mới.' 
      });
    }

    // Verify OTP
    const isValid = await bcrypt.compare(otp, otpDoc.otp_hash);
    
    if (!isValid) {
      // Increment attempts
      otpDoc.attempts += 1;
      await otpDoc.save();
      
      const remainingAttempts = maxAttempts - otpDoc.attempts;
      return res.status(400).json({ 
        error: `Mã xác thực không đúng. Còn ${remainingAttempts} lần thử.`,
        remainingAttempts
      });
    }

    // Mark OTP as used
    otpDoc.is_used = true;
    await otpDoc.save();

    // Update user as verified
    const user = await User.findById(otpDoc.user_id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    user.is_verified = true;
    await user.save();

    // Generate new token (optional: for auto-login after verification)
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Email đã được xác thực thành công!',
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        mssv: user.mssv,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Không thể xác thực. Vui lòng thử lại.' });
  }
});
```

#### 3. Resend OTP Endpoint

```javascript
// POST /auth/resend-otp
// Resend OTP with rate limiting
router.post('/resend-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy tài khoản với email này' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email đã được xác thực' });
    }

    // Check cooldown
    const cooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60;
    const lastOTP = await OTP.findOne({ email: normalizedEmail })
      .sort({ created_at: -1 });

    if (lastOTP) {
      const timeSinceLastOTP = Date.now() - lastOTP.created_at.getTime();
      const remainingCooldown = cooldownSeconds * 1000 - timeSinceLastOTP;
      
      if (remainingCooldown > 0) {
        return res.status(429).json({
          error: 'Vui lòng đợi trước khi yêu cầu mã mới',
          retryAfter: Math.ceil(remainingCooldown / 1000)
        });
      }
    }

    // Rate limiting: Check resend count in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      email: normalizedEmail,
      created_at: { $gte: oneHourAgo }
    });

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 3;
    if (recentOTPs >= maxResend) {
      return res.status(429).json({ 
        error: `Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau 1 giờ.`,
        retryAfter: 3600
      });
    }

    // Delete existing OTPs
    await OTP.deleteMany({ email: normalizedEmail });

    // Generate new OTP
    const otp = OTP.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    const otpDoc = new OTP({
      user_id: user._id,
      email: normalizedEmail,
      otp_hash: otpHash,
      expires_at: OTP.getExpiryTime()
    });
    await otpDoc.save();

    // Send email
    await sendOTPEmail(normalizedEmail, user.username, otp);

    res.json({ 
      message: 'Mã xác thực mới đã được gửi',
      email: normalizedEmail,
      expiresIn: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Không thể gửi mã xác thực. Vui lòng thử lại.' });
  }
});
```

---

## Task 2.2: Modify Registration Flow

Update the existing register endpoint to automatically send OTP after registration:

```javascript
// In the existing register route, add after user.save():

// Generate and send OTP
const otp = OTP.generateOTP();
const otpHash = await bcrypt.hash(otp, 10);

const otpDoc = new OTP({
  user_id: user._id,
  email: normalizedEmail,
  otp_hash: otpHash,
  expires_at: OTP.getExpiryTime()
});
await otpDoc.save();

// Send OTP email
try {
  await sendOTPEmail(normalizedEmail, user.username, otp);
} catch (emailError) {
  console.error('Failed to send verification email:', emailError);
  // Continue even if email fails - user can resend later
}

// Update response to include requireVerification flag
res.status(201).json({
  message: 'Tài khoản đã được tạo. Vui lòng kiểm tra email để xác thực.',
  token,
  requireVerification: true,
  user: {
    _id: user._id,
    email: user.email,
    username: user.username,
    mssv: user.mssv,
    avatar_url: user.avatar_url,
    is_verified: user.is_verified
  }
});
```

---

## Task 2.3: Update Login Flow (Optional)

Add verification check in login:

```javascript
// In the login route, after password verification:

// Check if email is verified (optional - can allow login but restrict features)
if (!user.is_verified) {
  return res.status(403).json({ 
    error: 'Vui lòng xác thực email trước khi đăng nhập',
    requireVerification: true,
    email: user.email
  });
}
```

---

## Required Imports

Add these imports at the top of `backend/routes/auth.js`:

```javascript
import OTP from '../models/OTP.js';
import { sendOTPEmail } from '../services/email.service.js';
```

---

## API Summary

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/send-otp` | POST | No | Send OTP to email |
| `/auth/verify-otp` | POST | No | Verify OTP code |
| `/auth/resend-otp` | POST | No | Resend OTP with cooldown |
| `/auth/register` | POST | No | Register + auto-send OTP |

---

## Error Codes

| HTTP Code | Meaning |
|-----------|---------|
| 400 | Invalid input or OTP |
| 404 | User not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

---

## Acceptance Criteria

- [ ] `/auth/send-otp` sends OTP email successfully
- [ ] `/auth/verify-otp` validates OTP and marks user verified
- [ ] `/auth/resend-otp` respects cooldown and rate limits
- [ ] Registration auto-sends OTP email
- [ ] Rate limiting prevents abuse
- [ ] Proper error messages in Vietnamese

---

## Next Phase

→ **Phase 3**: Frontend Components (OTP input, verification page)
