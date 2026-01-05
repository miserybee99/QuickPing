'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, ChevronUp, ChevronDown, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface PinnedMessagesProps {
  messages: Message[];
  onJumpToMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
  canUnpin: boolean;
  maxDisplay?: number;
}

export function PinnedMessages({
  messages,
  onJumpToMessage,
  onUnpin,
  canUnpin,
  maxDisplay = 3,
}: PinnedMessagesProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAll, setShowAll] = useState(false);

  if (!messages || messages.length === 0) return null;

  const displayedMessages = showAll ? messages : messages.slice(0, maxDisplay);
  const hasMore = messages.length > maxDisplay;

  const getContentPreview = (message: Message): string => {
    if (message.content) {
      const content = message.content.trim();
      if (content.length > 60) {
        return content.substring(0, 60) + '...';
      }
      return content;
    }
    
    if (message.file_info) {
      const mimeType = message.file_info.mime_type || '';
      if (mimeType.startsWith('image/')) return '📷 Photo';
      if (mimeType.startsWith('video/')) return '🎬 Video';
      if (mimeType.startsWith('audio/')) return '🎵 Audio';
      return `📎 ${message.file_info.filename || 'File'}`;
    }
    
    return 'Message';
  };

  const getTimeAgo = (date: Date | string): string => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
      >
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Pin className="w-4 h-4 text-[#615EF0]" />
          Pinned Messages ({messages.length})
        </h4>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-4 space-y-3 max-h-[300px] overflow-y-auto">
          {displayedMessages.map((message, index) => (
            <motion.div
              key={message._id}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 hover:border-[#615EF0]/30 dark:hover:border-[#615EF0]/30 transition-colors"
            >
              <Avatar className="h-8 w-8 flex-shrink-0 rounded-lg">
                <AvatarImage src={message.sender_id?.avatar_url} />
                <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 rounded-lg">
                  {message.sender_id?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <button
                onClick={() => onJumpToMessage(message._id)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {message.sender_id?.username || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {getTimeAgo(message.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {getContentPreview(message)}
                </p>
              </button>
              
              {canUnpin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpin(message._id);
                  }}
                  className={cn(
                    "h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
                    "text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400",
                    "hover:bg-red-50 dark:hover:bg-red-900/20"
                  )}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </motion.div>
          ))}

          {/* Show more/less button */}
          {hasMore && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full py-2 text-xs font-medium text-[#615EF0] hover:text-[#5048D9] dark:text-[#615EF0] dark:hover:text-[#7C73F0] transition-colors"
            >
              {showAll ? 'Show less' : `View all ${messages.length} pinned messages`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
