'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
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

  const handleVerify = useCallback(async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits');
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
      setError(errorData?.error || 'Verification failed. Please try again.');
      
      if (errorData?.remainingAttempts !== undefined) {
        setRemainingAttempts(errorData.remainingAttempts);
      }
      
      // Clear OTP on error
      setOTP('');
    } finally {
      setLoading(false);
    }
  }, [otp, email, router]);

  // Auto-submit when OTP is complete
  useEffect(() => {
    if (otp.length === 6 && !loading) {
      handleVerify();
    }
  }, [otp, loading, handleVerify]);

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-otp', { email });
      setError('');
      setRemainingAttempts(null);
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.retryAfter) {
        throw new Error(`Please wait ${errorData.retryAfter} seconds`);
      }
      throw new Error(errorData?.error || 'Could not resend code');
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
            <h2 className="text-2xl font-bold mb-2">Verification successful! 🎉</h2>
            <p className="text-muted-foreground mb-4">
              Your email has been verified. Redirecting...
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
                <CardTitle className="text-2xl font-bold">Verify Email</CardTitle>
                <CardDescription className="text-base">
                  We sent a 6-digit verification code to
                </CardDescription>
                <p className="font-medium text-foreground">{email || 'your email'}</p>
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
                <Alert className="bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {remainingAttempts} attempts remaining. After that you need to request a new code.
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
                    Verifying...
                  </>
                ) : (
                  'Verify'
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
                    Use a different email
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6">
            The verification code will expire in 10 minutes.
            <br />
            Check your spam folder if you don't see the email.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
