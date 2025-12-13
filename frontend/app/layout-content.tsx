'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';

export default function LayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  
  // Check authentication status
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (token && user) {
        try {
          const userData = JSON.parse(user);
          // User must be verified to access main app
          setIsAuthenticated(userData.is_verified === true);
        } catch {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    
    checkAuth();
    
    // Listen for storage changes (login/logout in other tabs)
    window.addEventListener('storage', checkAuth);
    return () => window.removeEventListener('storage', checkAuth);
  }, [pathname]);
  
  // Pages that should NEVER have sidebar (auth flow pages)
  const authFlowPages = ['/login', '/register', '/verify-email', '/auth/callback'];
  const isAuthFlowPage = authFlowPages.some(page => pathname.startsWith(page));

  // Show full-screen layout for auth pages OR when not authenticated
  if (isAuthFlowPage || isAuthenticated === false) {
    return <div className="h-screen w-screen overflow-auto">{children}</div>;
  }
  
  // Still loading auth state - show loading or children without sidebar
  if (isAuthenticated === null) {
    return <div className="h-screen w-screen overflow-auto">{children}</div>;
  }

  // Authenticated user - show sidebar layout
  return (
    <div className="grid h-screen overflow-hidden" style={{ gridTemplateColumns: '88px 1fr' }}>
      <Sidebar />
      <main className="h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}

