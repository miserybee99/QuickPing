'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  Users,
  UserCheck,
  Search, 
  User,
  Settings,
  Bell,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/useUser';
import { useNotifications } from '@/contexts/NotificationContext';

// Main navigation items
const mainNavigation = [
  { name: 'Messages', href: '/', icon: MessageSquare },
  { name: 'Groups', href: '/groups', icon: Users },
  { name: 'Friends', href: '/friends', icon: UserCheck },
  { name: 'Search', href: '/search', icon: Search },
];

// Secondary navigation items
const secondaryNavigation = [
  { name: 'Notifications', href: '/notifications', icon: Bell },
];

interface NavItemProps {
  item: {
    name: string;
    href: string;
    icon: LucideIcon;
  };
  isActive: boolean;
  badge?: number;
}

function NavItem({ item, isActive, badge }: NavItemProps) {
  const Icon = item.icon;
  
  return (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group',
        isActive 
          ? 'bg-primary text-primary-foreground shadow-md' 
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
      title={item.name}
    >
      <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
      
      {/* Notification badge */}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full shadow-sm">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      
      {/* Active indicator */}
      {isActive && (
        <span className="absolute -left-[22px] w-1 h-8 bg-primary rounded-r-full" />
      )}
      
      {/* Tooltip */}
      <span className="absolute left-full ml-4 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        {item.name}
        {badge !== undefined && badge > 0 && (
          <span className="ml-2 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
            {badge}
          </span>
        )}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();
  const { counts } = useNotifications();

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  // Get badge count for specific navigation items
  const getBadgeCount = (href: string): number | undefined => {
    switch (href) {
      case '/friends':
        return counts.friendRequests;
      case '/notifications':
        return counts.total;
      default:
        return undefined;
    }
  };

  return (
    <aside className="flex flex-col w-[72px] bg-sidebar-bg border-r border-border h-screen items-center py-4 justify-between">
      {/* Top Section */}
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <Link 
          href="/"
          className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow duration-200"
        >
          <span className="text-primary-foreground font-bold text-lg">Q</span>
        </Link>

        {/* Divider */}
        <div className="w-8 h-px bg-border" />

        {/* Main Navigation */}
        <nav className="flex flex-col items-center gap-2">
          {mainNavigation.map((item) => (
            <NavItem 
              key={item.name} 
              item={item} 
              isActive={isActive(item.href)}
              badge={getBadgeCount(item.href)}
            />
          ))}
        </nav>

        {/* Divider */}
        <div className="w-8 h-px bg-border" />

        {/* Secondary Navigation */}
        <nav className="flex flex-col items-center gap-2">
          {secondaryNavigation.map((item) => (
            <NavItem 
              key={item.name} 
              item={item} 
              isActive={isActive(item.href)}
              badge={getBadgeCount(item.href)}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-2">
        {/* Settings */}
        <NavItem 
          item={{ name: 'Settings', href: '/settings', icon: Settings }}
          isActive={isActive('/settings')}
        />

        {/* Avatar indicator only (not clickable to profile) */}
        <div
          className="relative flex items-center justify-center w-12 h-12 rounded-xl"
          title={user?.username || 'User'}
        >
          <Avatar className="w-9 h-9">
            <AvatarImage src={user?.avatar_url} alt={user?.username} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase() || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          
          {/* Online indicator */}
          {user?.is_online && (
            <span className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-sidebar-bg" />
          )}
        </div>
      </div>
    </aside>
  );
}

