# 📧 Email Verification System using OTP Mechanism

## 📋 Overview

Implement a complete email verification system using One-Time Password (OTP) mechanism for QuickPing. This system will ensure that users verify their email addresses after registration, enhancing security and reducing spam/fake accounts.

---

## 🎯 Goals

1. **Security**: Prevent fake accounts and ensure email ownership
2. **User Experience**: Simple 6-digit OTP input, easy to use
3. **Reliability**: Handle edge cases like expired OTPs, resend limits
4. **Integration**: Seamlessly integrate with existing auth flow

---

## 🏗️ Architecture

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          EMAIL VERIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────────────────┘

1. REGISTRATION
   ┌──────────┐    ┌──────────────┐    ┌─────────────┐
   │  User    │───▶│  Register    │───▶│ Create User │
   │ Register │    │  (Backend)   │    │ is_verified │
   └──────────┘    └──────────────┘    │   = false   │
                          │            └─────────────┘
                          ▼
                   ┌──────────────┐
                   │ Generate OTP │
                   │ (6 digits)   │
                   └──────────────┘
                          │
                          ▼
                   ┌──────────────┐    ┌─────────────┐
                   │  Send Email  │───▶│  User Gets  │
                   │   via SMTP   │    │  OTP Code   │
                   └──────────────┘    └─────────────┘

2. VERIFICATION
   ┌──────────┐    ┌──────────────┐    ┌─────────────┐
   │  User    │───▶│  Verify OTP  │───▶│  Validate   │
   │ Enters   │    │  (Backend)   │    │    OTP      │
   │   OTP    │    └──────────────┘    └─────────────┘
   └──────────┘                               │
                                              ▼
                                       ┌─────────────┐
                                       │ Update User │
                                       │ is_verified │
                                       │   = true    │
                                       └─────────────┘
```

---

## 📦 Components

### Backend

| Component | Description |
|-----------|-------------|
| `models/OTP.js` | MongoDB schema for storing OTP records |
| `services/email.service.js` | Email service using Nodemailer |
| `routes/auth.js` | Extended with OTP endpoints |
| `templates/otp-email.html` | HTML template for OTP email |

### Frontend

| Component | Description |
|-----------|-------------|
| `app/verify-email/page.tsx` | OTP verification page |
| `components/auth/otp-input.tsx` | 6-digit OTP input component |
| `components/auth/resend-timer.tsx` | Resend countdown component |

---

## 📁 File Structure

```
backend/
├── models/
│   └── OTP.js                    # NEW: OTP model
├── services/
│   └── email.service.js          # NEW: Email service
├── routes/
│   └── auth.js                   # MODIFY: Add OTP endpoints
└── templates/
    └── otp-email.html            # NEW: Email template

frontend/
├── app/
│   └── verify-email/
│       └── page.tsx              # NEW: Verification page
├── components/
│   └── auth/
│       ├── otp-input.tsx         # NEW: OTP input component
│       └── resend-timer.tsx      # NEW: Resend timer
└── types/
    └── index.ts                  # MODIFY: Add OTP types
```

---

## 🔧 Implementation Phases

### Phase 1: Backend - OTP Model & Email Service
**Estimated Time**: 30 mins

#### 1.1 Create OTP Model (`backend/models/OTP.js`)

```javascript
// Fields:
// - user_id: ObjectId (ref: User)
// - email: String
// - otp: String (6 digits, hashed)
// - expires_at: Date (10 minutes from creation)
// - attempts: Number (max 5 attempts)
// - created_at: Date

// Features:
// - Auto-expire TTL index
// - Rate limiting per email
```

#### 1.2 Create Email Service (`backend/services/email.service.js`)

```javascript
// Features:
// - Nodemailer transporter configuration
// - sendOTP(email, otp) function
// - HTML email template
// - Error handling & retry logic
```

### Phase 2: Backend - API Endpoints
**Estimated Time**: 45 mins

#### 2.1 Modify Registration Flow (`backend/routes/auth.js`)

**Current Flow:**
1. Register → Create User → Return Token

**New Flow:**
1. Register → Create User (is_verified=false) → Generate OTP → Send Email → Return Token + requireVerification flag

#### 2.2 Add New Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/auth/send-otp` | POST | Generate and send OTP to email |
| `/auth/verify-otp` | POST | Verify OTP and mark user as verified |
| `/auth/resend-otp` | POST | Resend OTP with rate limiting |

### Phase 3: Frontend - Verification Page
**Estimated Time**: 45 mins

#### 3.1 Create OTP Input Component (`frontend/components/auth/otp-input.tsx`)

```tsx
// Features:
// - 6 individual input boxes
// - Auto-focus to next input
// - Paste support for full OTP
// - Backspace navigation
// - Visual feedback (error/success)
```

#### 3.2 Create Resend Timer (`frontend/components/auth/resend-timer.tsx`)

```tsx
// Features:
// - 60 second countdown
// - Disable resend during countdown
// - Show remaining time
// - Reset on resend
```

#### 3.3 Create Verification Page (`frontend/app/verify-email/page.tsx`)

```tsx
// Features:
// - OTP input form
// - Resend OTP button with timer
// - Success redirect to home
// - Error handling
// - Session persistence
```

### Phase 4: Integration & Flow Updates
**Estimated Time**: 30 mins

#### 4.1 Update Register Page

- After successful registration, redirect to `/verify-email`
- Pass email via query param or session

#### 4.2 Update Login Page

- Check `is_verified` status
- If not verified, redirect to verification page

#### 4.3 Add Protected Routes Check

- Middleware to check verification status for certain actions

---

## 📊 Database Schema

### OTP Collection

```javascript
{
  _id: ObjectId,
  user_id: ObjectId,        // Reference to User
  email: String,            // User's email
  otp_hash: String,         // Hashed OTP (bcrypt)
  expires_at: Date,         // Expiration time (10 mins)
  attempts: Number,         // Failed attempts count
  is_used: Boolean,         // Whether OTP was used
  created_at: Date,
  updated_at: Date
}

// Indexes:
// - expires_at: TTL index (auto-delete after expiry)
// - email: for lookups
// - user_id: for user association
```

---

## 🔐 Security Considerations

| Concern | Solution |
|---------|----------|
| OTP Brute Force | Max 5 attempts, then lockout for 15 mins |
| OTP Guessing | 6-digit = 1 million combinations, expires in 10 mins |
| Email Spam | Max 3 resend per hour |
| OTP Interception | Use HTTPS, OTP valid for single use |
| Rate Limiting | Limit API calls per IP/email |

---

## 🎨 UI/UX Design

### Verification Page Layout

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              🔐 Xác thực Email                      │
│                                                     │
│    Chúng tôi đã gửi mã xác thực 6 chữ số          │
│    đến email: user@example.com                     │
│                                                     │
│         ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐       │
│         │ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │ │ 6 │       │
│         └───┘ └───┘ └───┘ └───┘ └───┘ └───┘       │
│                                                     │
│              [    Xác nhận    ]                     │
│                                                     │
│         Không nhận được mã?                        │
│         Gửi lại (còn 45 giây)                      │
│                                                     │
│         Đổi email khác                              │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Email Template

```
Subject: [QuickPing] Mã xác thực email của bạn

┌─────────────────────────────────────────────────────┐
│                   QuickPing                         │
│                                                     │
│  Xin chào {username}!                               │
│                                                     │
│  Mã xác thực của bạn là:                           │
│                                                     │
│          ┌─────────────────────┐                   │
│          │      123456         │                   │
│          └─────────────────────┘                   │
│                                                     │
│  Mã này sẽ hết hạn sau 10 phút.                    │
│                                                     │
│  Nếu bạn không yêu cầu mã này,                     │
│  vui lòng bỏ qua email này.                        │
│                                                     │
│  © 2024 QuickPing                                  │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Test Cases

### Backend Tests

| Test | Description |
|------|-------------|
| OTP Generation | Should generate 6-digit random number |
| OTP Hashing | Should hash OTP before storing |
| OTP Expiry | Should reject expired OTP |
| Max Attempts | Should lock after 5 failed attempts |
| Resend Limit | Should limit to 3 resends per hour |
| Email Sending | Should send email successfully |

### Frontend Tests

| Test | Description |
|------|-------------|
| OTP Input | Should accept 6 digits only |
| Auto-focus | Should move to next input automatically |
| Paste | Should handle pasted OTP correctly |
| Countdown | Should count down from 60 seconds |
| Resend | Should reset timer after resend |
| Error Display | Should show error messages |

---

## 📝 Environment Variables

Add to `.env`:

```env
# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# OTP Settings
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_RESEND_PER_HOUR=3
```

---

## 🚀 Execution Order

```
Step 1: Create OTP Model (backend/models/OTP.js)
        ↓
Step 2: Create Email Service (backend/services/email.service.js)
        ↓
Step 3: Create Email Template (backend/templates/otp-email.html)
        ↓
Step 4: Update Auth Routes (backend/routes/auth.js)
        ↓
Step 5: Create OTP Input Component (frontend/components/auth/otp-input.tsx)
        ↓
Step 6: Create Resend Timer (frontend/components/auth/resend-timer.tsx)
        ↓
Step 7: Create Verify Email Page (frontend/app/verify-email/page.tsx)
        ↓
Step 8: Update Register Page Flow
        ↓
Step 9: Update Login Page Flow
        ↓
Step 10: Test & Debug
```

---

## 📋 Task Checklist

### Backend

- [ ] Create `models/OTP.js` with TTL index
- [ ] Create `services/email.service.js` with Nodemailer
- [ ] Create `templates/otp-email.html` email template
- [ ] Add `POST /auth/send-otp` endpoint
- [ ] Add `POST /auth/verify-otp` endpoint
- [ ] Add `POST /auth/resend-otp` endpoint
- [ ] Update register flow to send OTP automatically
- [ ] Add rate limiting for OTP endpoints
- [ ] Add environment variables for SMTP config

### Frontend

- [ ] Create `components/auth/otp-input.tsx`
- [ ] Create `components/auth/resend-timer.tsx`
- [ ] Create `app/verify-email/page.tsx`
- [ ] Update `app/register/page.tsx` to redirect to verify
- [ ] Update `app/login/page.tsx` to check verification
- [ ] Add types for OTP-related data

### Testing

- [ ] Test OTP generation and validation
- [ ] Test email sending (sandbox mode)
- [ ] Test rate limiting
- [ ] Test UI components
- [ ] Test full flow end-to-end

---

## 🔗 Dependencies

### Existing (Already Installed)

- `nodemailer` - For sending emails
- `bcryptjs` - For hashing OTPs
- `jsonwebtoken` - For tokens
- `express-validator` - For input validation

### No New Dependencies Required

The project already has all necessary dependencies installed.

---

## 📅 Timeline

| Phase | Task | Time |
|-------|------|------|
| 1 | Backend Model & Service | 30 mins |
| 2 | Backend API Endpoints | 45 mins |
| 3 | Frontend Components | 45 mins |
| 4 | Integration & Testing | 30 mins |
| **Total** | | **~2.5 hours** |

---

## 🎓 Usage After Implementation

### For Users

1. **Register** → Receive OTP email
2. **Enter OTP** → Account verified
3. **Login** → Full access to app

### For Developers

```javascript
// Send OTP
POST /api/auth/send-otp
Body: { email: "user@example.com" }

// Verify OTP
POST /api/auth/verify-otp
Body: { email: "user@example.com", otp: "123456" }

// Resend OTP
POST /api/auth/resend-otp
Body: { email: "user@example.com" }
```

---

## 📚 References

- [Nodemailer Documentation](https://nodemailer.com/)
- [OWASP OTP Best Practices](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [MongoDB TTL Indexes](https://docs.mongodb.com/manual/core/index-ttl/)

---

**Ready to implement?** Use `/ck:code plans/20251205-1430-email-verification-otp` to start!
