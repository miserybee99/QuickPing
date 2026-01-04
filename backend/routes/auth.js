import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import School from '../models/School.js';
import UserSession from '../models/UserSession.js';
import OTP from '../models/OTP.js';
import { authenticate } from '../middleware/auth.js';
import { sendOTPEmail } from '../services/email.service.js';

const router = express.Router();

/**
 * Validate if email domain contains 'edu' as standalone word
 * This ensures only student emails from educational institutions are accepted
 * @param {string} email - Email address to validate
 * @returns {boolean} - true if valid student email, false otherwise
 */
function isValidStudentEmail(email) {
  const normalizedEmail = email.toLowerCase().trim();

  // Extract domain part (after @)
  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex === -1 || atIndex === normalizedEmail.length - 1) {
    return false;
  }

  const domain = normalizedEmail.substring(atIndex + 1);

  // Split domain by dots and check if any part exactly equals 'edu'
  const domainParts = domain.split('.');
  return domainParts.includes('edu');
}

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('username').trim().isLength({ min: 3, max: 30 }),
  body('password').isLength({ min: 6 }),
  body('mssv').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password, mssv } = req.body;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Validate student email domain (grandfather policy: only new registrations)
    if (!isValidStudentEmail(normalizedEmail)) {
      return res.status(400).json({
        error: 'Email must be a valid student email (domain must contain "edu"). Example: student@hcmute.edu.vn'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email: normalizedEmail }, { username: username.trim() }]
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Email or username already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user (no school validation required)
    const user = new User({
      email: normalizedEmail,
      username: username.trim(),
      password_hash,
      mssv: mssv?.trim() || undefined,
      school_id: null, // Optional, can be set later
      is_verified: false
    });

    await user.save();

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Save session
    const session = new UserSession({
      user_id: user._id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await session.save();

    // Generate and send OTP for email verification
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
      console.log('📧 Verification OTP sent to:', normalizedEmail);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue even if email fails - user can resend later
    }

    res.status(201).json({
      message: 'Account created successfully. Please check your email to verify.',
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
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const normalizedEmail = email.toLowerCase().trim();
    console.log('🔍 Login attempt:', { email: normalizedEmail, passwordLength: password.length });

    // Try to find user with normalized email
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Try case-insensitive search as fallback
      const userCaseInsensitive = await User.findOne({
        email: { $regex: new RegExp(`^${normalizedEmail}$`, 'i') }
      });

      if (userCaseInsensitive) {
        console.log('⚠️ Found user with different case, updating email to normalized version');
        userCaseInsensitive.email = normalizedEmail;
        await userCaseInsensitive.save();
        const isValid = await bcrypt.compare(password, userCaseInsensitive.password_hash);
        if (isValid) {
          // Update last seen
          userCaseInsensitive.last_seen = new Date();
          await userCaseInsensitive.save();

          // 2FA: Always require OTP for every login
          console.log('🔐 Sending login OTP to:', userCaseInsensitive.email);

          await OTP.deleteMany({ email: userCaseInsensitive.email });

          const otp = OTP.generateOTP();
          const otpHash = await bcrypt.hash(otp, 10);

          const otpDoc = new OTP({
            user_id: userCaseInsensitive._id,
            email: userCaseInsensitive.email,
            otp_hash: otpHash,
            type: 'email_verification',
            expires_at: OTP.getExpiryTime()
          });
          await otpDoc.save();

          try {
            await sendOTPEmail(userCaseInsensitive.email, userCaseInsensitive.username, otp);
          } catch (emailError) {
            console.error('Failed to send login OTP:', emailError);
          }

          // Return 403 to indicate OTP verification required
          return res.status(403).json({
            requireVerification: true,
            email: userCaseInsensitive.email,
            message: 'Please check your email and enter the OTP code to login.'
          });
        }
      }
      console.log('❌ User not found:', normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', { userId: user._id, email: user.email, hasPasswordHash: !!user.password_hash });

    if (!user.password_hash) {
      console.log('❌ User has no password_hash');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('🔐 Comparing password...');
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password match:', isValid);

    if (!isValid) {
      console.log('❌ Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen
    user.last_seen = new Date();
    await user.save();

    // 2FA: Always require OTP for every login (not just unverified users)
    console.log('🔐 Sending login OTP to:', user.email);

    // Delete existing OTPs for this user
    await OTP.deleteMany({ email: user.email });

    // Generate and send new OTP
    const otp = OTP.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    const otpDoc = new OTP({
      user_id: user._id,
      email: user.email,
      otp_hash: otpHash,
      type: 'email_verification', // Can be 'login_verification' if you want to separate
      expires_at: OTP.getExpiryTime()
    });
    await otpDoc.save();

    // Send OTP email
    try {
      await sendOTPEmail(user.email, user.username, otp);
      console.log('✅ Login OTP sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send login OTP:', emailError);
    }

    // Return 403 to indicate OTP verification required, no token yet
    return res.status(403).json({
      requireVerification: true,
      email: user.email,
      message: 'Please check your email and enter the OTP code to login.'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
router.post('/verify-email', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In production, send verification email with token
    // For now, just mark as verified
    user.is_verified = true;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password_hash')
      .populate('school_id', 'name domain');

    res.json({ user });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await UserSession.deleteOne({ token });
    }

    // Update user offline status
    const user = await User.findById(req.user._id);
    if (user) {
      user.is_online = false;
      user.last_seen = new Date();
      await user.save();
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==================== OTP ENDPOINTS ====================

// Send OTP to email
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
      return res.status(404).json({ error: 'Account not found with this email' });
    }

    // Check if already verified
    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Rate limiting: Check resend count in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOTPs = await OTP.countDocuments({
      email: normalizedEmail,
      created_at: { $gte: oneHourAgo }
    });

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 5;
    if (recentOTPs >= maxResend) {
      return res.status(429).json({
        error: `Too many requests. Please try again after 1 hour.`,
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
      message: 'Verification code has been sent to your email',
      email: normalizedEmail,
      expiresIn: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Unable to send verification code. Please try again.' });
  }
});

// Verify OTP
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
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
    if (otpDoc.attempts >= maxAttempts) {
      return res.status(429).json({
        error: 'Maximum attempts exceeded. Please request a new code.'
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
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }

    // Mark OTP as used
    otpDoc.is_used = true;
    await otpDoc.save();

    // Update user as verified
    const user = await User.findById(otpDoc.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.is_verified = true;
    await user.save();

    // Generate new token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Save session
    const session = new UserSession({
      user_id: user._id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });
    await session.save();

    res.json({
      message: 'Email verified successfully!',
      token,
      user: {
        _id: user._id,
        email: user.email,
        username: user.username,
        mssv: user.mssv,
        avatar_url: user.avatar_url,
        bio: user.bio,
        role: user.role,
        is_verified: user.is_verified,
        preferences: user.preferences
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Unable to verify. Please try again.' });
  }
});

// Resend OTP
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
      return res.status(404).json({ error: 'Account not found with this email' });
    }

    if (user.is_verified) {
      return res.status(400).json({ error: 'Email already verified' });
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
          error: 'Please wait before requesting a new code',
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

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 5;
    if (recentOTPs >= maxResend) {
      return res.status(429).json({
        error: `Too many requests. Please try again after 1 hour.`,
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
      message: 'New verification code has been sent',
      email: normalizedEmail,
      expiresIn: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Unable to send verification code. Please try again.' });
  }
});

// ==================== FORGOT PASSWORD ENDPOINTS ====================

// Request password reset
router.post('/forgot-password', [
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
      // Don't reveal if email exists or not (security)
      return res.json({
        message: 'If the email exists in the system, you will receive a verification code to reset your password.',
        email: normalizedEmail
      });
    }

    // Rate limiting: Check reset requests in last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentResets = await OTP.countDocuments({
      email: normalizedEmail,
      type: 'password_reset',
      created_at: { $gte: oneHourAgo }
    });

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 5;
    if (recentResets >= maxResend) {
      return res.status(429).json({
        error: `Too many requests. Please try again after 1 hour.`,
        retryAfter: 3600
      });
    }

    // Delete any existing password reset OTPs for this email
    await OTP.deleteMany({
      email: normalizedEmail,
      type: 'password_reset'
    });

    // Generate new OTP
    const otp = OTP.generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);

    // Save OTP with password_reset type
    const otpDoc = new OTP({
      user_id: user._id,
      email: normalizedEmail,
      otp_hash: otpHash,
      type: 'password_reset',
      expires_at: OTP.getExpiryTime()
    });
    await otpDoc.save();

    // Send password reset email
    const { sendPasswordResetOTPEmail } = await import('../services/email.service.js');
    await sendPasswordResetOTPEmail(normalizedEmail, user.username, otp);

    console.log('🔐 Password reset OTP sent to:', normalizedEmail);

    res.json({
      message: 'Verification code has been sent to your email',
      email: normalizedEmail,
      expiresIn: parseInt(process.env.OTP_EXPIRES_MINUTES) || 10
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Unable to send verification code. Please try again.' });
  }
});

// Reset password with OTP
router.post('/reset-password', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    // Find the OTP record for password reset
    const otpDoc = await OTP.findOne({
      email: normalizedEmail,
      type: 'password_reset',
      is_used: false,
      expires_at: { $gt: new Date() }
    });

    if (!otpDoc) {
      return res.status(400).json({ error: 'Invalid or expired verification code' });
    }

    // Check attempts
    const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;
    if (otpDoc.attempts >= maxAttempts) {
      return res.status(429).json({
        error: 'Maximum attempts exceeded. Please request a new code.'
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
        error: `Invalid verification code. ${remainingAttempts} attempts remaining.`,
        remainingAttempts
      });
    }

    // Mark OTP as used
    otpDoc.is_used = true;
    await otpDoc.save();

    // Find user and update password
    const user = await User.findById(otpDoc.user_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password_hash = newPasswordHash;
    await user.save();

    // Invalidate all existing sessions for security
    await UserSession.deleteMany({ user_id: user._id });

    console.log('🔐 Password reset successfully for:', user.email);

    res.json({
      message: 'Password reset successfully! Please login again.',
      success: true
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Unable to reset password. Please try again.' });
  }
});

export default router;

