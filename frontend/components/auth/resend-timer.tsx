'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

interface ResendTimerProps {
  initialSeconds?: number;
  onResend: () => Promise<void>;
  disabled?: boolean;
}

export function ResendTimer({
  initialSeconds = 60,
  onResend,
  disabled = false
}: ResendTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isLoading, setIsLoading] = useState(false);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (seconds > 0) {
      const timer = setInterval(() => {
        setSeconds((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setCanResend(true);
    }
  }, [seconds]);

  const handleResend = useCallback(async () => {
    if (!canResend || isLoading || disabled) return;

    setIsLoading(true);
    try {
      await onResend();
      // Reset timer after successful resend
      setSeconds(initialSeconds);
      setCanResend(false);
    } catch (error) {
      // Allow immediate retry on error
      console.error('Resend failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [canResend, isLoading, disabled, onResend, initialSeconds]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${remainingSecs}s`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm text-muted-foreground">
        Không nhận được mã?
      </p>
      
      {canResend ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isLoading || disabled}
          className="text-primary hover:text-primary/80"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Gửi lại mã
            </>
          )}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          Gửi lại sau <span className="font-medium text-foreground">{formatTime(seconds)}</span>
        </p>
      )}
    </div>
  );
}
