import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import School from '../models/School.js';
import UserSession from '../models/UserSession.js';
import OTP from '../models/OTP.js';
import { authenticate } from '../middleware/auth.js';
import { sendOTPEmail } from '../services/email.service.js';

const router = express.Router();

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
          // Continue with login flow...
          userCaseInsensitive.last_seen = new Date();
          await userCaseInsensitive.save();
          const token = jwt.sign(
            { userId: userCaseInsensitive._id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
          );
          const session = new UserSession({
            user_id: userCaseInsensitive._id,
            token,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          });
          await session.save();
          
          // Check if email verification is required
          if (!userCaseInsensitive.is_verified) {
            console.log('📧 User not verified, sending OTP to:', userCaseInsensitive.email);
            
            await OTP.deleteMany({ email: userCaseInsensitive.email });
            
            const otp = OTP.generateOTP();
            const otpHash = await bcrypt.hash(otp, 10);
            
            const otpDoc = new OTP({
              user_id: userCaseInsensitive._id,
              email: userCaseInsensitive.email,
              otp_hash: otpHash,
              expires_at: OTP.getExpiryTime()
            });
            await otpDoc.save();
            
            try {
              await sendOTPEmail(userCaseInsensitive.email, userCaseInsensitive.username, otp);
            } catch (emailError) {
              console.error('Failed to send verification email:', emailError);
            }
            
            return res.json({
              token,
              requireVerification: true,
              user: {
                _id: userCaseInsensitive._id,
                email: userCaseInsensitive.email,
                username: userCaseInsensitive.username,
                mssv: userCaseInsensitive.mssv,
                avatar_url: userCaseInsensitive.avatar_url,
                bio: userCaseInsensitive.bio,
                role: userCaseInsensitive.role,
                is_verified: userCaseInsensitive.is_verified,
                preferences: userCaseInsensitive.preferences
              }
            });
          }
          
          return res.json({
            token,
            user: {
              _id: userCaseInsensitive._id,
              email: userCaseInsensitive.email,
              username: userCaseInsensitive.username,
              mssv: userCaseInsensitive.mssv,
              avatar_url: userCaseInsensitive.avatar_url,
              bio: userCaseInsensitive.bio,
              role: userCaseInsensitive.role,
              is_verified: userCaseInsensitive.is_verified,
              preferences: userCaseInsensitive.preferences
            }
          });
        }
      }
      console.log('❌ User not found:', normalizedEmail);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('✅ User found:', { userId: user._id, email: user.email, hasPasswordHash: !!user.password_hash });

    if (!user.password_hash) {
      console.log('❌ User has no password_hash');
      return res.status(401).json({ error: 'Please use OAuth login' });
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

    // Check if email verification is required
    console.log('🔍 Checking verification status:', { 
      userId: user._id, 
      email: user.email, 
      is_verified: user.is_verified 
    });
    
    if (!user.is_verified) {
      console.log('📧 User not verified, sending OTP to:', user.email);
      
      // Delete existing OTPs for this user
      await OTP.deleteMany({ email: user.email });
      
      // Generate and send new OTP
      const otp = OTP.generateOTP();
      const otpHash = await bcrypt.hash(otp, 10);
      
      const otpDoc = new OTP({
        user_id: user._id,
        email: user.email,
        otp_hash: otpHash,
        expires_at: OTP.getExpiryTime()
      });
      await otpDoc.save();
      
      // Send OTP email
      try {
        await sendOTPEmail(user.email, user.username, otp);
        console.log('✅ Verification OTP sent to:', user.email);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
      
      return res.json({
        token,
        requireVerification: true,
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
    }

    res.json({
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

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 5;
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
      message: 'Email đã được xác thực thành công!',
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
    res.status(500).json({ error: 'Không thể xác thực. Vui lòng thử lại.' });
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

    const maxResend = parseInt(process.env.OTP_MAX_RESEND_PER_HOUR) || 5;
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

// ==================== GOOGLE OAUTH ENDPOINTS ====================

// Initiate Google OAuth
router.get('/google', (req, res, next) => {
  // Check if Google OAuth is configured
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(501).json({ 
      error: 'Đăng nhập Google chưa được cấu hình. Vui lòng liên hệ admin.' 
    });
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { 
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`
  }, async (err, user) => {
    try {
      if (err) {
        console.error('❌ Google OAuth error:', err);
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(err.message || 'google_auth_failed')}`
        );
      }

      if (!user) {
        console.error('❌ Google OAuth: No user returned');
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=google_auth_failed`
        );
      }

      // Update online status
      user.is_online = true;
      user.last_seen = new Date();
      await user.save();

      // Generate JWT token
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

      console.log('✅ Google OAuth successful for:', user.email);

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
      
    } catch (error) {
      console.error('❌ Google OAuth callback error:', error);
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?error=server_error`
      );
    }
  })(req, res, next);
});

// Check Google OAuth status
router.get('/google/status', (req, res) => {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  res.json({ 
    enabled: isConfigured,
    message: isConfigured 
      ? 'Google OAuth đã được cấu hình' 
      : 'Google OAuth chưa được cấu hình'
  });
});

export default router;

