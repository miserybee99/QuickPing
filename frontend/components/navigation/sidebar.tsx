'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  MessageSquare, 
  BarChart2, 
  Search, 
  Calendar,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useState, useEffect } from 'react';

const navigation = [
  { name: 'Chat', href: '/', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart2 },
  { name: 'Tìm kiếm', href: '/search', icon: Search },
  { name: 'Lịch', href: '/calendar', icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <div className="flex flex-col w-[88px] bg-white border-r border-gray-200 h-screen items-center py-4 px-4 justify-between shadow-[0px_0px_24px_0px_rgba(0,0,0,0.08)]">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-12">
        {/* Logo */}
        <div className="w-14 h-14 rounded-[14px] bg-[#615EF0] flex items-center justify-center">
          <span className="text-white font-bold text-[21px]">Q</span>
        </div>

        {/* Navigation Icons */}
        <nav className="flex flex-col items-center gap-8">
          {navigation.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'p-0 transition-colors relative group',
                  isActive ? 'text-[#615EF0]' : 'text-gray-600 hover:text-[#615EF0]'
                )}
                title={item.name}
              >
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2 : 1.5} />
                {/* Tooltip */}
                <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section - Settings Icon */}
      <Link
        href="/settings"
        className={cn(
          'p-0 transition-colors relative group',
          pathname === '/settings' ? 'text-[#615EF0]' : 'text-gray-600 hover:text-[#615EF0]'
        )}
        title="Settings"
      >
        <Settings className="w-6 h-6" strokeWidth={pathname === '/settings' ? 2 : 1.5} />
        <span className="absolute left-full ml-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
          Settings
        </span>
      </Link>
    </div>
  );
}

