'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing login...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        console.log('🔐 Auth callback - token:', token ? 'exists' : 'missing', 'error:', error);

        if (error) {
          setStatus('error');
          setMessage('Login failed. Please try again.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }

        if (!token) {
          setStatus('error');
          setMessage('Authentication token not found.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return;
        }

        // Store the token FIRST
        localStorage.setItem('token', token);
        console.log('✅ Token saved to localStorage');

        // Fetch user data with the new token
        try {
          const response = await api.get('/auth/me');
          const { user } = response.data;
          
          localStorage.setItem('user', JSON.stringify(user));
          console.log('✅ User data saved:', user.email);

          setStatus('success');
          setMessage('Đăng nhập thành công! Đang chuyển hướng...');

          // Use window.location for hard redirect
          setTimeout(() => {
            console.log('🚀 Redirecting to home...');
            window.location.href = '/';
          }, 1000);

        } catch (apiError: any) {
          console.error('❌ Failed to fetch user:', apiError);
          // Token might still be valid, try redirecting anyway
          setStatus('success');
          setMessage('Login successful! Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 1000);
        }

      } catch (error: any) {
        console.error('❌ Auth callback error:', error);
        setStatus('error');
        setMessage(error.response?.data?.error || 'An error occurred. Please try again.');
        
        // Clear any invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      }
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center"
      >
        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {message}
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait a moment...
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </motion.div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {message}
            </h2>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Login Failed
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              {message}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
