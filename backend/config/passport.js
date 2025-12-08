import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

const configurePassport = () => {
  // Only configure if Google credentials are provided
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.log('⚠️ Google OAuth not configured - missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback',
        scope: ['profile', 'email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          console.log('🔐 Google OAuth callback:', {
            id: profile.id,
            email: profile.emails?.[0]?.value,
            displayName: profile.displayName
          });

          const email = profile.emails?.[0]?.value?.toLowerCase();
          const googleId = profile.id;

          if (!email) {
            return done(new Error('Không thể lấy email từ Google'), null);
          }

          // Check if user exists by Google ID or email
          let user = await User.findOne({
            $or: [
              { google_id: googleId },
              { email: email }
            ]
          });

          if (user) {
            // Update existing user with Google ID if not set
            if (!user.google_id) {
              user.google_id = googleId;
              user.is_verified = true; // Google emails are verified
              
              // Update avatar if not set
              if (!user.avatar_url && profile.photos?.[0]?.value) {
                user.avatar_url = profile.photos[0].value;
              }
              
              await user.save();
              console.log('✅ Linked Google account to existing user:', user.email);
            } else {
              console.log('✅ Found existing Google user:', user.email);
            }
          } else {
            // Create new user
            const username = await generateUniqueUsername(
              profile.displayName || email.split('@')[0]
            );

            user = new User({
              email: email,
              username: username,
              google_id: googleId,
              avatar_url: profile.photos?.[0]?.value || '',
              is_verified: true, // Google emails are verified
              is_online: true
            });

            await user.save();
            console.log('✅ Created new Google user:', user.email);
          }

          return done(null, user);
        } catch (error) {
          console.error('❌ Google OAuth error:', error);
          return done(error, null);
        }
      }
    )
  );

  // Serialize user for session (not really used with JWT, but required by passport)
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  console.log('✅ Google OAuth configured successfully');
};

// Helper function to generate unique username
async function generateUniqueUsername(baseName) {
  // Clean the base name - remove special chars and spaces
  let cleanName = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20);

  if (!cleanName) {
    cleanName = 'user';
  }

  let username = cleanName;
  let counter = 1;

  // Keep trying until we find a unique username
  while (await User.findOne({ username })) {
    username = `${cleanName}${counter}`;
    counter++;
    
    // Safety limit
    if (counter > 1000) {
      username = `${cleanName}${Date.now()}`;
      break;
    }
  }

  return username;
}

export default configurePassport;
