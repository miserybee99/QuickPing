'use client';

import { ReactNode } from 'react';
import { LucideIcon, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  /** Icon displayed before the title */
  icon?: LucideIcon;
  /** Main title of the page */
  title: string;
  /** Subtitle/description below the title */
  subtitle?: string;
  /** Show back button */
  showBackButton?: boolean;
  /** Custom back navigation handler */
  onBack?: () => void;
  /** Actions displayed on the right side */
  actions?: ReactNode;
  /** Additional className for customization */
  className?: string;
  /** Make header sticky */
  sticky?: boolean;
}

export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  showBackButton = false,
  onBack,
  actions,
  className,
  sticky = true,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <header
      className={cn(
        'border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60',
        sticky && 'sticky top-0 z-40',
        className
      )}
    >
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-3 min-w-0">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0 hover:bg-muted"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-3 min-w-0">
              {Icon && (
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
              )}
              
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

