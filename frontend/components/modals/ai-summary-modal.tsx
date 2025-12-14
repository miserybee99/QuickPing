'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  FileText, 
  Copy, 
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface AISummary {
  overall_summary: string;
  summary?: string;
}

interface AISummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  conversationName: string;
  messageCount: number;
}

// Skeleton loading component
function SummarySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2 p-4 bg-gray-100 rounded-lg">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  );
}

export function AISummaryModal({
  open,
  onOpenChange,
  conversationId,
  conversationName,
  messageCount,
}: AISummaryModalProps) {
  const [copied, setCopied] = useState(false);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.ai.summarize(conversationId);
      
      // Get the summary text - handle both overall_summary and summary fields
      let summaryText = response.overall_summary || response.summary || '';
      
      // If the summary is JSON (starts with {), try to extract the text
      if (typeof summaryText === 'string' && summaryText.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(summaryText);
          // Try to extract readable text from JSON
          summaryText = parsed.overall_summary || parsed.summary || summaryText;
        } catch {
          // Keep as is if parsing fails
        }
      }
      
      setSummary({
        overall_summary: summaryText,
        summary: summaryText
      });
    } catch (err: any) {
      console.error('Failed to fetch AI summary:', err);
      setError(err.response?.data?.error || err.message || 'Could not generate summary');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Fetch summary when modal opens - only once per modal open
  useEffect(() => {
    if (open && !summary && !isLoading && !error) {
      fetchSummary();
    }
  }, [open]); // Only depend on 'open' to prevent multiple fetches

  // Reset state when conversation changes (not when modal closes to preserve cache)
  useEffect(() => {
    setSummary(null);
    setError(null);
  }, [conversationId]);

  const handleRetry = () => {
    setSummary(null);
    fetchSummary();
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleCopyToClipboard = async () => {
    if (!summary) return;

    const text = `📝 AI Summary - ${conversationName}
${'-'.repeat(40)}

${summary.overall_summary}
`;

    try {
      await navigator.clipboard.writeText(text.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="w-6 h-6 text-[#615EF0]" />
            AI Summary
            <Badge variant="outline" className="ml-2 text-xs font-normal">
              Gemini 2.5 Flash
            </Badge>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Summary of {Math.min(messageCount, 50)} latest messages in "{conversationName}"
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          <div className="space-y-6 py-4">
            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin text-[#615EF0]" />
                  <span>Analyzing conversation...</span>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  Estimated 5-10 seconds
                </p>
                <SummarySkeleton />
              </div>
            )}

            {/* Error State */}
            {error && !isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-gray-900">Could not generate summary</p>
                  <p className="text-sm text-muted-foreground mt-1">{error}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleRetry}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry
                </Button>
              </motion.div>
            )}

            {/* Summary Content */}
            {summary && !isLoading && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {/* Summary Section */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <FileText className="w-5 h-5 text-[#615EF0]" />
                    Summary
                  </h3>
                  <div className="bg-gradient-to-r from-[#615EF0]/5 to-purple-50 rounded-lg p-4 border border-[#615EF0]/20">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {summary.overall_summary}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {summary && !isLoading && !error && (
          <div className="flex justify-between items-center gap-3 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Summarized from {Math.min(messageCount, 50)} messages
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleRetry}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
