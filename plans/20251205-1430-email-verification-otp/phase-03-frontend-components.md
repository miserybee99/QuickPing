# Phase 3: Frontend - Components & Verification Page

## Overview
Create React components for OTP input and the email verification page.

---

## Task 3.1: Create OTP Input Component

**File**: `frontend/components/auth/otp-input.tsx`

### Implementation

```tsx
'use client';

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true
}: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (index: number, digit: string) => {
    // Only allow digits
    if (!/^\d*$/.test(digit)) return;

    const newValue = value.split('');
    newValue[index] = digit.slice(-1); // Take only last character
    const newOTP = newValue.join('');
    onChange(newOTP);

    // Move to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newValue = value.split('');
      
      if (newValue[index]) {
        // Clear current input
        newValue[index] = '';
        onChange(newValue.join(''));
      } else if (index > 0) {
        // Move to previous input and clear it
        newValue[index - 1] = '';
        onChange(newValue.join(''));
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    
    if (pastedData) {
      onChange(pastedData.padEnd(length, ''));
      // Focus last filled input or last input
      const focusIndex = Math.min(pastedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      setActiveIndex(focusIndex);
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
    // Select the input content
    inputRefs.current[index]?.select();
  };

  return (
    <div className="flex gap-2 sm:gap-3 justify-center">
      {Array.from({ length }, (_, index) => (
        <input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={() => handleFocus(index)}
          disabled={disabled}
          className={cn(
            "w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-bold rounded-xl border-2",
            "transition-all duration-200 outline-none",
            "focus:ring-2 focus:ring-primary/20",
            disabled && "opacity-50 cursor-not-allowed bg-muted",
            error 
              ? "border-destructive bg-destructive/5 text-destructive" 
              : activeIndex === index
                ? "border-primary bg-primary/5"
                : "border-input bg-background hover:border-primary/50"
          )}
          aria-label={`Digit ${index + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
```

### Features

- ✅ Auto-focus to next input on digit entry
- ✅ Backspace navigates to previous input
- ✅ Arrow key navigation
- ✅ Paste support for full OTP
- ✅ Visual feedback for active/error states
- ✅ Accessible with ARIA labels
- ✅ Mobile-friendly with numeric keyboard

---

## Task 3.2: Create Resend Timer Component

**File**: `frontend/components/auth/resend-timer.tsx`

### Implementation

```tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ResendTimerProps {
  initialSeconds?: number;
  onResend: () => Promise<void>;
  disabled?: boolean;
}

export function ResendTimer({
  initialSeconds = 60,
  onResend,
  disabled = false
}: ResendTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [seconds]);

  const handleResend = useCallback(async () => {
    if (!canResend || isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onResend();
      // Reset timer after successful resend
      setSeconds(initialSeconds);
      setCanResend(false);
    } catch (error) {
      // Allow immediate retry on error
      console.error('Resend failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canResend, isLoading, disabled, onResend, initialSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${remainingSecs}s`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Không nhận được mã?
      </p>
      
      {canResend ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isLoading || disabled}
          className="text-primary hover:text-primary/80"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gửi lại mã
            </>
          )}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Gửi lại sau <span className="font-medium text-foreground">{formatTime(seconds)}</span>
        </p>
      )}
    </div>
  );
}
```

### Features

- ✅ Countdown timer with formatting
- ✅ Loading state during resend
- ✅ Auto-reset after resend
- ✅ Disabled state support
- ✅ Clean, minimal UI

---

## Task 3.3: Create Verify Email Page

**File**: `frontend/app/verify-email/page.tsx`

### Implementation

```tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { MailCheck, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OTPInput } from '@/components/auth/otp-input';
import { ResendTimer } from '@/components/auth/resend-timer';
import Link from 'next/link';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromParams = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailFromParams);
  const [otp, setOTP] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Get email from localStorage if not in params
  useEffect(() => {
    if (!email) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          if (user.email) {
            setEmail(user.email);
          }
        } catch (e) {
          console.error('Failed to parse stored user');
        }
      }
    }
  }, [email]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  }, [otp]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Vui lòng nhập đủ 6 chữ số');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/verify-otp', {
        email,
        otp
      });

      const { token, user } = response.data;
      
      // Update localStorage
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setSuccess(true);
      
      // Redirect after animation
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 2000);

    } catch (err: any) {
      const errorData = err.response?.data;
      setError(errorData?.error || 'Xác thực thất bại. Vui lòng thử lại.');
      
      if (errorData?.remainingAttempts !== undefined) {
        setRemainingAttempts(errorData.remainingAttempts);
      }
      
      // Clear OTP on error
      setOTP('');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      setError('');
      setRemainingAttempts(null);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.retryAfter) {
        throw new Error(`Vui lòng đợi ${errorData.retryAfter} giây`);
      }
      throw new Error(errorData?.error || 'Không thể gửi lại mã');
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <Card className="max-w-md text-center p-8">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Xác thực thành công! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Email của bạn đã được xác thực. Đang chuyển hướng...
            </p>
            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px]"
        >
          <Card className="shadow-2xl">
            <CardHeader className="space-y-4 text-center px-6 sm:px-8 pt-8 pb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="bg-primary/10 p-4 rounded-full">
                  <MailCheck className="h-12 w-12 text-primary" />
                </div>
              </motion.div>
              
              <div className="space-y-2">
                <CardTitle className="text-2xl font-bold">Xác thực Email</CardTitle>
                <CardDescription className="text-base">
                  Chúng tôi đã gửi mã xác thực 6 chữ số đến
                </CardDescription>
                <p className="font-medium text-foreground">{email || 'email của bạn'}</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}

              {remainingAttempts !== null && remainingAttempts <= 2 && (
                <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Còn {remainingAttempts} lần thử. Sau đó bạn cần yêu cầu mã mới.
                  </AlertDescription>
                </Alert>
              )}

              <div className="py-4">
                <OTPInput
                  value={otp}
                  onChange={setOTP}
                  disabled={loading}
                  error={!!error}
                />
              </div>

              <Button
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang xác thực...
                  </>
                ) : (
                  'Xác nhận'
                )}
              </Button>

              <div className="pt-2">
                <ResendTimer
                  initialSeconds={60}
                  onResend={handleResend}
                  disabled={loading}
                />
              </div>

              <div className="border-t pt-4">
                <Link href="/register">
                  <Button variant="ghost" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Dùng email khác
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Mã xác thực sẽ hết hạn sau 10 phút.
            <br />
            Kiểm tra thư mục spam nếu không thấy email.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
```

### Features

- ✅ Auto-submit on complete OTP
- ✅ Success animation with redirect
- ✅ Error handling with remaining attempts
- ✅ Resend with countdown timer
- ✅ Email from URL params or localStorage
- ✅ Responsive design
- ✅ Loading states

---

## Task 3.4: Create Components Index

**File**: `frontend/components/auth/index.ts`

```typescript
export { OTPInput } from './otp-input';
export { ResendTimer } from './resend-timer';
```

---

## Acceptance Criteria

- [ ] OTP input accepts 6 digits only
- [ ] Auto-focus and navigation works correctly
- [ ] Paste functionality works
- [ ] Resend timer counts down properly
- [ ] Verification page handles all states
- [ ] Success redirect works
- [ ] Error messages display correctly
- [ ] Mobile responsive

---

## Next Phase

→ **Phase 4**: Integration & Flow Updates (register/login modifications)
