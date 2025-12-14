'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { Loader2 } from 'lucide-react';

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  
  // Pages that don't require authentication (public pages)
  const publicPages = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password', '/auth/callback'];
  const isPublicPage = publicPages.some(page => pathname.startsWith(page));

  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      const pendingVerification = localStorage.getItem('pendingVerification');
      
      console.log('🔐 Layout auth check:', { 
        pathname,
        hasToken: !!token, 
        hasUser: !!user,
        pendingVerification,
        isPublicPage 
      });
      
      // If pending verification, treat as unauthenticated (let verify-email page handle it)
      if (pendingVerification === 'true') {
        console.log('⏳ Pending verification, treating as unauthenticated');
        setAuthState('unauthenticated');
        return;
      }
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          console.log('👤 User data:', { email: userData.email, is_verified: userData.is_verified });
          
          // User must be verified to access main app
          if (userData.is_verified === true) {
            console.log('✅ User authenticated and verified');
            setAuthState('authenticated');
          } else {
            // User logged in but not verified - redirect to verify
            console.log('❌ User not verified');
            setAuthState('unauthenticated');
            if (!isPublicPage) {
              router.replace(`/verify-email?email=${encodeURIComponent(userData.email || '')}`);
            }
          }
        } catch {
          console.log('❌ Failed to parse user data');
          setAuthState('unauthenticated');
        }
      } else {
        console.log('❌ No token or user found');
        setAuthState('unauthenticated');
      }
    };
    
    checkAuth();
    
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname, isPublicPage, router]);

  // Redirect unauthenticated users to login (except on public pages)
  useEffect(() => {
    if (authState === 'unauthenticated' && !isPublicPage) {
      router.replace('/login');
    }
  }, [authState, isPublicPage, router]);

  // Show loading spinner while checking auth
  if (authState === 'loading') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Public pages - show without sidebar
  if (isPublicPage) {
    return <div className="h-screen w-screen overflow-auto">{children}</div>;
  }
  
  // Not authenticated and not on public page - show loading while redirecting
  if (authState === 'unauthenticated') {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authenticated user - show sidebar layout
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}

