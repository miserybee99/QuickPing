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
  Target, 
  CheckSquare, 
  Copy, 
  Check,
  Loader2,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Users,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface Topic {
  name: string;
  summary: string;
  participants: string[];
  conclusion?: string | null;
}

interface AISummary {
  topics: Topic[];
  overall_summary: string;
  key_decisions: string[];
  action_items: {
    assignee: string;
    task: string;
  }[];
  // Legacy fields for backward compatibility
  summary?: string;
  keyPoints?: string[];
  actionItems?: {
    assignee: string;
    task: string;
  }[];
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
    <div className="space-y-6 animate-pulse">
      {/* Overall summary skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="w-32 h-5 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2 p-4 bg-gray-100 rounded-lg">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>

      {/* Topics skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="w-24 h-5 bg-gray-200 rounded" />
        </div>
        {[1, 2].map((i) => (
          <div key={i} className="p-4 border rounded-lg space-y-2">
            <div className="h-5 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
            <div className="flex gap-2 mt-2">
              <div className="h-6 bg-gray-200 rounded w-16" />
              <div className="h-6 bg-gray-200 rounded w-16" />
            </div>
          </div>
        ))}
      </div>

      {/* Action items skeleton */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="w-28 h-5 bg-gray-200 rounded" />
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2 p-3 bg-gray-100 rounded-lg">
            <div className="w-4 h-4 bg-gray-200 rounded mt-0.5" />
            <div className="h-4 bg-gray-200 rounded w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Topic Card Component
function TopicCard({ topic, index }: { topic: Topic; index: number }) {
  const [isExpanded, setIsExpanded] = useState(index === 0); // First topic expanded by default

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="border border-gray-200 rounded-lg"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#615EF0]/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-[#615EF0]" />
          </div>
          <span className="font-medium text-gray-900 text-left">{topic.name}</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-500 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
        )}
      </button>
      
      {isExpanded && (
        <div className="bg-white border-t border-gray-100">
          <div 
            className="p-4 space-y-3 max-h-[250px] overflow-y-auto"
            style={{ overscrollBehavior: 'contain' }}
          >
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{topic.summary}</p>
            
            {/* Participants */}
            {topic.participants && topic.participants.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {topic.participants.map((participant, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {participant}
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Conclusion if exists */}
            {topic.conclusion && (
              <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                  <Lightbulb className="w-4 h-4" />
                  Conclusion
                </div>
                <p className="text-green-800 text-sm">{topic.conclusion}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
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
      setSummary({
        topics: response.topics || [],
        overall_summary: response.overall_summary || response.summary || '',
        key_decisions: response.key_decisions || [],
        action_items: response.action_items || response.actionItems || [],
        // Legacy fields
        summary: response.summary,
        keyPoints: response.keyPoints,
        actionItems: response.actionItems,
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

    // Build copy text with new format
    let topicsText = '';
    if (summary.topics && summary.topics.length > 0) {
      topicsText = summary.topics.map(t => 
        `📌 ${t.name}\n   ${t.summary}${t.conclusion ? `\n   → Conclusion: ${t.conclusion}` : ''}`
      ).join('\n\n');
    }

    const text = `📝 AI Summary - ${conversationName}
${'-'.repeat(40)}

📄 Overall Summary:
${summary.overall_summary}

${topicsText ? `🏷️ Detailed Topics:\n${topicsText}` : ''}

${summary.key_decisions && summary.key_decisions.length > 0 ? `💡 Key Decisions:
${summary.key_decisions.map(d => `• ${d}`).join('\n')}` : ''}

${summary.action_items && summary.action_items.length > 0 ? `✅ Action Items:
${summary.action_items.map(item => `□ ${item.assignee}: ${item.task}`).join('\n')}` : ''}
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
                className="space-y-6"
              >
                {/* Overall Summary Section */}
                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                    <FileText className="w-5 h-5 text-[#615EF0]" />
                    Overall Summary
                  </h3>
                  <div className="bg-gradient-to-r from-[#615EF0]/5 to-purple-50 rounded-lg p-4 border border-[#615EF0]/20">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {summary.overall_summary}
                    </p>
                  </div>
                </div>

                {/* Topics Section */}
                {summary.topics && summary.topics.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                      <Target className="w-5 h-5 text-[#615EF0]" />
                      Detailed Topics
                      <Badge variant="secondary" className="ml-1">
                        {summary.topics.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {summary.topics.map((topic, index) => (
                        <TopicCard key={index} topic={topic} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Decisions Section */}
                {summary.key_decisions && summary.key_decisions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                      <Lightbulb className="w-5 h-5 text-[#615EF0]" />
                      Key Decisions
                    </h3>
                    <ul className="space-y-2">
                      {summary.key_decisions.map((decision, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                        >
                          <span className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-blue-800">{decision}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Action Items Section */}
                {summary.action_items && summary.action_items.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="flex items-center gap-2 font-semibold text-gray-900">
                      <CheckSquare className="w-5 h-5 text-[#615EF0]" />
                      Action Items
                    </h3>
                    <ul className="space-y-2">
                      {summary.action_items.map((item, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 bg-amber-50 rounded-lg p-3 border border-amber-200"
                        >
                          <CheckSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="font-medium text-amber-800">
                              {item.assignee}:
                            </span>{' '}
                            <span className="text-amber-700">{item.task}</span>
                          </div>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* No specific content fallback */}
                {(!summary.topics || summary.topics.length === 0) && 
                 (!summary.key_decisions || summary.key_decisions.length === 0) &&
                 (!summary.action_items || summary.action_items.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No specific topics, decisions or action items detected.</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        {summary && !isLoading && !error && (
          <div className="flex justify-between items-center gap-3 pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Summarized {summary.topics?.length || 0} topics from {Math.min(messageCount, 50)} messages
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
