# Phase 4: Integration & Flow Updates

## Overview
Integrate the OTP verification system with existing authentication flows and update the register/login pages.

---

## Task 4.1: Update Register Page

**File**: `frontend/app/register/page.tsx`

### Changes Required

1. After successful registration, redirect to `/verify-email?email={userEmail}`
2. Show message that verification email was sent

```tsx
// Update handleSubmit function:

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');

  if (formData.password !== formData.confirmPassword) {
    setError('Mật khẩu không khớp');
    return;
  }

  if (formData.password.length < 6) {
    setError('Mật khẩu phải có ít nhất 6 ký tự');
    return;
  }

  setLoading(true);

  try {
    const response = await api.post('/auth/register', {
      email: formData.email,
      username: formData.username,
      password: formData.password,
      mssv: formData.mssv || undefined
    });

    const { token, user, requireVerification } = response.data;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Redirect to verification page if required
    if (requireVerification || !user.is_verified) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
    } else {
      router.push('/');
    }
  } catch (err: any) {
    setError(err.response?.data?.error || 'Đăng ký thất bại');
  } finally {
    setLoading(false);
  }
};
```

---

## Task 4.2: Update Login Page

**File**: `frontend/app/login/page.tsx`

### Changes Required

1. Check for `requireVerification` in response
2. Redirect unverified users to verification page

```tsx
// Update handleSubmit function:

const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    const response = await api.post('/auth/login', { 
      email: email.trim().toLowerCase(), 
      password 
    });
    
    const { token, user, requireVerification } = response.data;
    
    if (typeof window !== 'undefined') {
      localStorage.clear();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    // Check if verification is required
    if (requireVerification || (user && !user.is_verified)) {
      router.push(`/verify-email?email=${encodeURIComponent(user.email)}`);
      return;
    }
    
    router.push('/');
    router.refresh();
  } catch (err: any) {
    const errorData = err.response?.data;
    
    // Handle verification required error
    if (errorData?.requireVerification && errorData?.email) {
      // Store minimal info and redirect to verification
      localStorage.setItem('pendingVerificationEmail', errorData.email);
      router.push(`/verify-email?email=${encodeURIComponent(errorData.email)}`);
      return;
    }
    
    const errorMessage = errorData?.error || errorData?.message || 'Đăng nhập thất bại';
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};
```

---

## Task 4.3: Update Types

**File**: `frontend/types/index.ts`

### Add OTP-related Types

```typescript
// Add these types to the existing file:

export interface OTPVerificationResponse {
  message: string;
  token: string;
  user: User;
}

export interface SendOTPResponse {
  message: string;
  email: string;
  expiresIn: number;
}

export interface ResendOTPResponse {
  message: string;
  email: string;
  expiresIn: number;
}

export interface AuthResponse {
  message?: string;
  token: string;
  user: User;
  requireVerification?: boolean;
}

export interface AuthError {
  error: string;
  requireVerification?: boolean;
  email?: string;
  remainingAttempts?: number;
  retryAfter?: number;
}
```

---

## Task 4.4: Add Verification Check Middleware (Optional)

**File**: `frontend/middleware.ts` (if exists) or create new

For pages that require verified email:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get user from cookie or check server-side
  // This is a simplified example
  
  const protectedPaths = ['/groups/create', '/settings'];
  const path = request.nextUrl.pathname;
  
  if (protectedPaths.some(p => path.startsWith(p))) {
    // Check verification status
    // Redirect to /verify-email if not verified
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/groups/:path*', '/settings/:path*']
};
```

---

## Task 4.5: Update API Client Error Handling

**File**: `frontend/lib/api.ts`

### Add Verification Error Handling

```typescript
// Add to the response interceptor:

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorData = error.response?.data;
    
    // Handle verification required
    if (error.response?.status === 403 && errorData?.requireVerification) {
      if (typeof window !== 'undefined') {
        const email = errorData.email;
        if (email) {
          window.location.href = `/verify-email?email=${encodeURIComponent(email)}`;
        }
      }
    }
    
    // Existing 401 handling...
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/verify-email') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## Task 4.6: Add Verification Status Indicator (Optional)

**File**: `frontend/components/navigation/user-menu.tsx` (or similar)

Add a visual indicator for unverified users:

```tsx
// In user profile/menu component:

{!user.is_verified && (
  <Link href={`/verify-email?email=${user.email}`}>
    <Badge variant="destructive" className="ml-2">
      <AlertCircle className="h-3 w-3 mr-1" />
      Chưa xác thực
    </Badge>
  </Link>
)}
```

---

## Flow Summary

### Registration Flow

```
1. User fills registration form
2. Submit → POST /auth/register
3. Backend creates user (is_verified=false)
4. Backend generates OTP, sends email
5. Backend returns { token, user, requireVerification: true }
6. Frontend saves token, redirects to /verify-email?email=xxx
7. User enters OTP from email
8. Submit → POST /auth/verify-otp
9. Backend validates, updates is_verified=true
10. Frontend redirects to home
```

### Login Flow (Unverified User)

```
1. User enters credentials
2. Submit → POST /auth/login
3. Backend checks is_verified
4. If false: returns 403 { requireVerification: true, email }
5. Frontend redirects to /verify-email?email=xxx
6. User completes verification
7. User can now login normally
```

---

## Testing Checklist

### Registration

- [ ] New user registers successfully
- [ ] OTP email is sent
- [ ] Redirect to verify-email page works
- [ ] Email is passed via URL param

### Verification

- [ ] OTP input works correctly
- [ ] Valid OTP verifies successfully
- [ ] Invalid OTP shows error with attempts
- [ ] Resend works with cooldown
- [ ] Success redirects to home

### Login

- [ ] Verified user can login
- [ ] Unverified user redirected to verify
- [ ] After verification, login works

### Edge Cases

- [ ] Expired OTP shows proper message
- [ ] Max attempts lockout works
- [ ] Rate limiting prevents abuse
- [ ] Email in spam folder notice shown

---

## Environment Setup

### Backend `.env` additions:

```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-app-email@gmail.com
SMTP_PASS=your-app-password

# For development (Ethereal)
ETHEREAL_USER=
ETHEREAL_PASS=

# OTP Settings
OTP_EXPIRES_MINUTES=10
OTP_MAX_ATTEMPTS=5
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_RESEND_PER_HOUR=3
```

### Gmail App Password Setup:

1. Enable 2-Factor Authentication on Google account
2. Go to Google Account → Security → App passwords
3. Create new app password for "Mail"
4. Use generated password in `SMTP_PASS`

---

## Deployment Notes

1. **Email Deliverability**: Use reputable SMTP provider in production
2. **Rate Limiting**: Consider additional rate limiting at nginx/cloudflare level
3. **Monitoring**: Log OTP send/verify events for security auditing
4. **Backup**: Store OTP records with proper backup strategy

---

## Acceptance Criteria

- [ ] Register → Verify Email flow works end-to-end
- [ ] Login with unverified account redirects properly
- [ ] All error states handled gracefully
- [ ] Rate limiting protects against abuse
- [ ] Emails delivered successfully
- [ ] Mobile responsive UI
- [ ] Accessible components

---

## Ready to Implement!

Use `/ck:code plans/20251205-1430-email-verification-otp` to start implementation.

Or implement phase by phase:
1. `/ck:code plans/20251205-1430-email-verification-otp/phase-01-backend-model-service.md`
2. `/ck:code plans/20251205-1430-email-verification-otp/phase-02-backend-api-endpoints.md`
3. `/ck:code plans/20251205-1430-email-verification-otp/phase-03-frontend-components.md`
4. `/ck:code plans/20251205-1430-email-verification-otp/phase-04-integration.md`
