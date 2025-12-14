import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SocketProvider } from '@/contexts/SocketContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { UserStatusProvider } from '@/contexts/UserStatusContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import LayoutContent from './layout-content';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuickPing - Chat Platform',
  description: 'Chat platform for students and teachers',
};

// Script to prevent FOUC (Flash of Unstyled Content)
const themeScript = `
  (function() {
    try {
      var theme = localStorage.getItem('quickping-theme') || 'light';
      var fontSize = localStorage.getItem('quickping-font-size') || 'medium';
      
      var resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      
      if (resolved === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      document.documentElement.style.colorScheme = resolved;
      document.documentElement.classList.add('font-' + fontSize);
      
      var fontSizeMap = { small: '14px', medium: '16px', large: '18px' };
      document.documentElement.style.setProperty('--base-font-size', fontSizeMap[fontSize]);
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ThemeProvider>
          <SocketProvider>
            <SidebarProvider>
              <UserStatusProvider>
                <NotificationProvider>
                  <LayoutContent>{children}</LayoutContent>
                </NotificationProvider>
              </UserStatusProvider>
            </SidebarProvider>
          </SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

