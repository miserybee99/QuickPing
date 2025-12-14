'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, AlertCircle, CheckCircle2, Key } from 'lucide-react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/reset-password', { 
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword
      });
      
      console.log('✅ Reset password success:', response.data);
      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login');
      }, 2000);
      
    } catch (err: any) {
      console.error('❌ Reset password error:', err.response?.data || err.message);
      const errorData = err.response?.data;
      const errorMessage = errorData?.error || errorData?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
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
                  <Lock className="h-12 w-12 text-red-500" />
                </div>
              </motion.div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-bold">Đặt lại mật khẩu</CardTitle>
                <CardDescription className="text-base">
                  Nhập mã OTP và mật khẩu mới của bạn
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
                      Mật khẩu đã được đặt lại thành công! Đang chuyển đến trang đăng nhập...
                    </AlertDescription>
                  </Alert>
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-base font-medium">
                    Mã OTP (6 chữ số)
                  </Label>
                  <div className="relative w-full">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      id="otp"
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="123456"
                      maxLength={6}
                      className="w-full pl-11 pr-4 h-12 text-base tracking-widest text-center font-mono"
                      disabled={success}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Nhập mã 6 chữ số đã được gửi đến email {email}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-base font-medium">
                    Mật khẩu mới
                  </Label>
                  <div className="relative w-full">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 h-12 text-base"
                      disabled={success}
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">
                    Xác nhận mật khẩu mới
                  </Label>
                  <div className="relative w-full">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none z-10" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                      className="w-full pl-11 pr-4 h-12 text-base"
                      disabled={success}
                      minLength={6}
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
                      Đang xử lý...
                    </>
                  ) : success ? (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Thành công!
                    </>
                  ) : (
                    'Đặt lại mật khẩu'
                  )}
                </Button>
              </form>

              <div className="text-center text-base pt-4 space-y-2">
                <div>
                  <Link 
                    href="/forgot-password" 
                    className="text-primary font-semibold hover:underline transition-colors"
                  >
                    Chưa nhận được mã? Gửi lại
                  </Link>
                </div>
                <div>
                  <Link 
                    href="/login" 
                    className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại đăng nhập
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
