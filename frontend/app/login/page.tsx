'use client';

import { useState, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function LoginContent() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔍 Login attempt:', { email, passwordLength: password.length });
      
      const response = await api.post('/auth/login', { 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      console.log('✅ Login success:', response.data);
      const { token, user } = response.data;
      
      // Save token and user to localStorage (only for verified users)
      if (typeof window !== 'undefined') {
        localStorage.clear();
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        // Use window.location.href to force a full page reload and avoid race conditions
        window.location.href = '/';
      }
    } catch (err: any) {
      console.error('❌ Login error:', err.response?.data || err.message);
      const errorData = err.response?.data;
      
      // Handle verification required error (403)
      if (errorData?.requireVerification && errorData?.email) {
        localStorage.setItem('pendingVerificationEmail', errorData.email);
        router.push(`/verify-email?email=${encodeURIComponent(errorData.email)}`);
        return;
      }
      
      const errorMessage = errorData?.error || errorData?.message || 'Login failed';
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
                <div className="bg-primary/10 p-4 rounded-full">
                  <MessageCircle className="h-12 w-12 text-primary" />
                </div>
              </motion.div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold">QuickPing</CardTitle>
                <CardDescription className="text-base">
                  Sign in to start chatting
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
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-base font-medium">
                    Password
                  </Label>
                  <Link 
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative w-full">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 h-12 text-base"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 text-base font-semibold mt-6"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            <div className="text-center text-base pt-4">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link 
                href="/register" 
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Sign up
              </Link>
            </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8 px-4">
            By signing in, you agree to our{' '}
            <a href="#" className="underline hover:text-primary font-medium transition-colors">
              Terms of Service
            </a>
            {' '}and{' '}
            <a href="#" className="underline hover:text-primary font-medium transition-colors">
              Privacy Policy
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

