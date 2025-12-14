'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pin, ChevronUp, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Message } from '@/types';
import { formatDistanceToNow } from 'date-fns';

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
  const [isExpanded, setIsExpanded] = useState(false);
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
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="bg-amber-50 border-b border-amber-200"
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800">
            Pinned Messages ({messages.length})
          </span>
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 0 : 180 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronUp className="h-4 w-4 text-amber-600" />
        </motion.div>
      </button>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 pb-3"
          >
            <div className="space-y-2">
              {displayedMessages.map((message, index) => (
                <motion.div
                  key={message._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group flex items-start gap-3 p-2 rounded-lg hover:bg-amber-100/50 transition-colors"
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={message.sender_id?.avatar_url} />
                    <AvatarFallback className="text-[10px] bg-amber-200">
                      {message.sender_id?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <button
                    onClick={() => onJumpToMessage(message._id)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-800 truncate">
                        {message.sender_id?.username || 'Unknown'}
                      </span>
                      <span className="text-[10px] text-amber-600/70">
                        {getTimeAgo(message.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-amber-900/80 truncate mt-0.5">
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
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-amber-600 hover:text-amber-800 hover:bg-amber-200"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>

            {/* Show more/less button */}
            {hasMore && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full mt-2 py-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
              >
                {showAll ? 'Show less' : `View all ${messages.length} pinned messages`}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
