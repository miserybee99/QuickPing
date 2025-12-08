'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getFileUrl } from '@/lib/file-utils';

interface UserAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
}

/**
 * Wrapper for Avatar component that automatically converts relative URLs to absolute backend URLs
 */
export function UserAvatar({ src, alt, fallback, className }: UserAvatarProps) {
  const avatarUrl = src ? getFileUrl(src) : undefined;
  
  return (
    <Avatar className={className}>
      <AvatarImage src={avatarUrl} alt={alt} />
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}
