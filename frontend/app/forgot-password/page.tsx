'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { 
        email: email.trim().toLowerCase()
      });
      
      console.log('✅ Forgot password success:', response.data);
      setSuccess(true);
      
      // Redirect to reset password page after 2 seconds
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Forgot password error:', err.response?.data || err.message);
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Unable to send verification code. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[480px] lg:max-w-[520px]"
        >
          <Card className="shadow-2xl">
            <CardHeader className="space-y-4 text-center px-6 sm:px-8 pt-8 pb-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="flex justify-center"
              >
                <div className="bg-red-500/10 p-4 rounded-full">
                  <Mail className="h-12 w-12 text-red-500" />
                </div>
              </motion.div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold">Forgot Password?</CardTitle>
                <CardDescription className="text-base">
                  Enter your email to receive verification code
                </CardDescription>
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

              {success && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Alert className="bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Verification code has been sent to your email! Redirecting...
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    Email
                  </Label>
                  <div className="relative w-full">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="your.email@example.com"
                      className="w-full pl-11 pr-4 h-12 text-base"
                      disabled={success}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || success}
                  className="w-full h-12 text-base font-semibold mt-6"
                  size="lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Sending...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Sent!
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </Button>
              </form>

              <div className="text-center text-base pt-4">
                <Link 
                  href="/login" 
                  className="text-primary font-semibold hover:underline transition-colors inline-flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
