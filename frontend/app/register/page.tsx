'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { MessageCircle, Mail, User as UserIcon, Lock, IdCard, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormData {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  mssv: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    mssv: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
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
      setError(err.response?.data?.error || 'Registration failed');
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
                  Create an account to get started
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-medium">
                  Email
                </Label>
                <div className="relative w-full">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    placeholder="your.email@example.com"
                    className="w-full pl-11 pr-4 h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-base font-medium">
                  Username
                </Label>
                <div className="relative w-full">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => handleChange('username', e.target.value)}
                    required
                    minLength={3}
                    placeholder="Display name"
                    className="w-full pl-11 pr-4 h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mssv" className="text-base font-medium">
                  Student ID <span className="text-muted-foreground text-sm">(optional)</span>
                </Label>
                <div className="relative w-full">
                  <IdCard className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="mssv"
                    type="text"
                    value={formData.mssv}
                    onChange={(e) => handleChange('mssv', e.target.value)}
                    placeholder="Student ID number"
                    className="w-full pl-11 pr-4 h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base font-medium">
                  Password
                </Label>
                <div className="relative w-full">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 h-12 text-base"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-base font-medium">
                  Confirm Password
                </Label>
                <div className="relative w-full">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
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
                    Creating account...
                  </>
                ) : (
                  'Sign Up'
                )}
              </Button>
            </form>

            <div className="text-center text-base pt-4">
              <span className="text-muted-foreground">Already have an account? </span>
              <Link 
                href="/login" 
                className="text-primary font-semibold hover:underline transition-colors"
              >
                Sign in
              </Link>
            </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-8 px-4">
            By signing up, you agree to our{' '}
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

