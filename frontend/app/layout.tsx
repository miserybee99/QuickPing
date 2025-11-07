import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { SocketProvider } from '@/contexts/SocketContext';
import { SidebarProvider } from '@/contexts/SidebarContext';
import { Sidebar } from '@/components/navigation/sidebar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'QuickPing - Chat Platform',
  description: 'Chat platform for students and teachers',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning className="h-full overflow-hidden">
      <body className={`${inter.className} h-full overflow-hidden`} suppressHydrationWarning>
        <SocketProvider>
          <SidebarProvider>
            <div className="grid h-full" style={{ gridTemplateColumns: '88px 1fr' }}>
              <Sidebar />
              <main className="h-full overflow-hidden">
                {children}
              </main>
            </div>
          </SidebarProvider>
        </SocketProvider>
      </body>
    </html>
  );
}

