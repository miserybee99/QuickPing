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
  FolderOpen,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/hooks/useUser';

// Main navigation items
const mainNavigation = [
  { name: 'Tin nhắn', href: '/', icon: MessageSquare },
  { name: 'Nhóm', href: '/groups', icon: Users },
  { name: 'Bạn bè', href: '/friends', icon: UserCheck },
  { name: 'Tìm kiếm', href: '/search', icon: Search },
];

// Secondary navigation items
const secondaryNavigation = [
  { name: 'Thông báo', href: '/notifications', icon: Bell },
  { name: 'Files', href: '/files', icon: FolderOpen },
];

interface NavItemProps {
  item: {
    name: string;
    href: string;
    icon: LucideIcon;
  };
  isActive: boolean;
}

function NavItem({ item, isActive }: NavItemProps) {
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
      
      {/* Active indicator */}
      {isActive && (
        <span className="absolute -left-[22px] w-1 h-8 bg-primary rounded-r-full" />
      )}
      
      {/* Tooltip */}
      <span className="absolute left-full ml-4 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
        {item.name}
      </span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useUser();

  // Don't show sidebar on login/register pages
  if (pathname === '/login' || pathname === '/register') {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
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
            />
          ))}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="flex flex-col items-center gap-2">
        {/* Settings */}
        <NavItem 
          item={{ name: 'Cài đặt', href: '/settings', icon: Settings }}
          isActive={isActive('/settings')}
        />

        {/* Profile with Avatar */}
        <Link
          href="/profile"
          className={cn(
            'relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 group',
            isActive('/profile')
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              : 'hover:ring-2 hover:ring-muted hover:ring-offset-2 hover:ring-offset-background'
          )}
          title="Hồ sơ"
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
          
          {/* Tooltip */}
          <span className="absolute left-full ml-4 px-3 py-2 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg border border-border opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-200">
            Hồ sơ
          </span>
        </Link>
      </div>
    </aside>
  );
}

