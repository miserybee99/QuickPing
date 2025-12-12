'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageContainerProps {
  /** Page content */
  children: ReactNode;
  /** Maximum width variant */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Additional className */
  className?: string;
  /** Remove default padding */
  noPadding?: boolean;
  /** Center content horizontally */
  centered?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-6xl',
  full: 'max-w-full',
};

export function PageContainer({
  children,
  maxWidth = 'lg',
  className,
  noPadding = false,
  centered = true,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'min-h-[calc(100vh-73px)]', // Account for header height
        !noPadding && 'px-4 sm:px-6 py-6 sm:py-8',
        centered && 'mx-auto',
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Full-height page wrapper with flex column layout
 * Useful for pages that need to fill the viewport
 */
export function PageWrapper({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('h-full flex flex-col bg-background', className)}>
      {children}
    </div>
  );
}

/**
 * Page section with optional title and description
 */
interface PageSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export function PageSection({
  children,
  title,
  description,
  className,
}: PageSectionProps) {
  return (
    <section className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

