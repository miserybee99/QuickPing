'use client';

import { useState, useRef } from 'react';
import { MoreHorizontal, Reply, Smile, Pin, Pencil, Trash2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { EmojiPicker } from '@/components/emoji/emoji-picker';

interface MessageActionsProps {
  isOwnMessage: boolean;
  isVisible: boolean;
  isPinned?: boolean;
  canPin?: boolean;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPin?: () => void;
  onThread?: () => void;
  className?: string;
}

export function MessageActions({
  isOwnMessage,
  isVisible,
  isPinned = false,
  canPin = true,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onPin,
  onThread,
  className,
}: MessageActionsProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  // Keep visible when menu is open or emoji picker is open
  const shouldShow = isVisible || isMenuOpen || showEmojiPicker;

  const handleEmojiSelect = (emoji: string) => {
    onReact?.(emoji);
    setShowEmojiPicker(false);
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className={cn(
            'flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-sm px-1 py-0.5 relative',
            className
          )}
        >
          {/* Quick React Button with Emoji Picker */}
          <div className="relative">
            <Button
              ref={emojiButtonRef}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add reaction"
            >
              <Smile className="h-4 w-4" />
            </Button>
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect}
              triggerRef={emojiButtonRef}
              position="top"
            />
          </div>

          {/* Quick Reply Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
            onClick={onReply}
            title="Reply"
          >
            <Reply className="h-4 w-4" />
          </Button>

          {/* More Options Dropdown */}
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {/* Removed Reply and Add Reaction as they're already in the action bar */}
              
              <DropdownMenuItem onClick={onThread} className="cursor-pointer">
                <MessageCircle className="h-4 w-4 mr-2" />
                Reply in Thread
              </DropdownMenuItem>
              
              {canPin && (
                <DropdownMenuItem onClick={onPin} className="cursor-pointer">
                  <Pin className="h-4 w-4 mr-2" />
                  {isPinned ? 'Unpin Message' : 'Pin Message'}
                </DropdownMenuItem>
              )}

              {isOwnMessage && (
                <>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Message
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
