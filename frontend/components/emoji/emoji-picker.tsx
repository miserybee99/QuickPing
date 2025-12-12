'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, Search, Clock, Heart, Coffee, Flag, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  position?: 'top' | 'bottom';
}

// Emoji categories
const emojiCategories = {
  recent: {
    icon: Clock,
    label: 'Recent',
    emojis: ['😊', '👍', '❤️', '😂', '🎉', '🔥', '💯', '👏']
  },
  smileys: {
    icon: Smile,
    label: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴']
  },
  gestures: {
    icon: Heart,
    label: 'Gestures',
    emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '🤏', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳']
  },
  objects: {
    icon: Coffee,
    label: 'Objects',
    emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '⛹️', '🤾', '🏌️', '🏇', '🧘', '🏊', '🤽', '🚣', '🧗']
  },
  symbols: {
    icon: Flag,
    label: 'Symbols',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
  },
  popular: {
    icon: Zap,
    label: 'Popular',
    emojis: ['🔥', '💯', '⚡', '✨', '💥', '💫', '🌟', '⭐', '✅', '❌', '⚠️', '💢', '💬', '👀', '💀', '☠️', '🤡', '👻', '👽', '🤖', '💩', '🎉', '🎊', '🎁', '🎈', '🎀', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️']
  }
};

export function EmojiPicker({ onEmojiSelect, isOpen, onClose, triggerRef, position = 'top' }: EmojiPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(
    emojiCategories.recent.emojis
  );
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const pickerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before using portal
  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate position based on trigger element
  const calculatePosition = useCallback(() => {
    if (!triggerRef?.current) return;
    
    const rect = triggerRef.current.getBoundingClientRect();
    const pickerWidth = 350;
    const pickerHeight = 420; // Approximate height
    
    let top: number;
    let left = rect.left;
    
    // Adjust horizontal position if overflowing right
    if (left + pickerWidth > window.innerWidth - 20) {
      left = window.innerWidth - pickerWidth - 20;
    }
    // Adjust horizontal position if overflowing left
    if (left < 20) {
      left = 20;
    }
    
    if (position === 'top') {
      top = rect.top - pickerHeight - 8;
      // If overflowing top, show below instead
      if (top < 20) {
        top = rect.bottom + 8;
      }
    } else {
      top = rect.bottom + 8;
      // If overflowing bottom, show above instead
      if (top + pickerHeight > window.innerHeight - 20) {
        top = rect.top - pickerHeight - 8;
      }
    }
    
    setPickerPosition({ top, left });
  }, [triggerRef, position]);

  useEffect(() => {
    if (isOpen) {
      calculatePosition();
      window.addEventListener('resize', calculatePosition);
      window.addEventListener('scroll', calculatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, calculatePosition]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        // Also check if click is on trigger
        if (triggerRef?.current && triggerRef.current.contains(event.target as Node)) {
          return;
        }
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, triggerRef]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    
    // Add to recent (max 20)
    setRecentEmojis((prev) => {
      const filtered = prev.filter((e) => e !== emoji);
      return [emoji, ...filtered].slice(0, 20);
    });
  };

  const getFilteredEmojis = (emojis: string[]) => {
    if (!searchQuery) return emojis;
    // Simple filtering for demo, can be enhanced
    return emojis.filter(() => Math.random() > 0.5);
  };

  // Use portal to render picker at document body level
  const pickerContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={pickerRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={triggerRef ? { position: 'fixed', top: pickerPosition.top, left: pickerPosition.left } : {}}
          className={triggerRef 
            ? "w-[350px] bg-background border rounded-lg shadow-2xl z-[9999]" 
            : "absolute bottom-full right-0 mb-2 w-[350px] bg-background border rounded-lg shadow-2xl z-[9999]"
          }
        >
          {/* Header */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search emoji..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Emoji tabs */}
          <Tabs defaultValue="recent" className="w-full">
            <TabsList className="w-full justify-start px-2 h-12 border-b rounded-none">
              {Object.entries(emojiCategories).map(([key, category]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="data-[state=active]:bg-accent"
                >
                  <category.icon className="h-4 w-4" />
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="h-[300px]">
              {Object.entries(emojiCategories).map(([key, category]) => (
                <TabsContent key={key} value={key} className="p-3 mt-0">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {category.label}
                  </p>
                  <div className="grid grid-cols-8 gap-1">
                    {(key === 'recent' ? recentEmojis : getFilteredEmojis(category.emojis)).map(
                      (emoji, index) => (
                        <motion.button
                          key={`${emoji}-${index}`}
                          whileHover={{ scale: 1.3 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEmojiClick(emoji)}
                          className="h-10 w-10 flex items-center justify-center text-2xl hover:bg-accent rounded transition-colors"
                        >
                          {emoji}
                        </motion.button>
                      )
                    )}
                  </div>
                </TabsContent>
              ))}
            </ScrollArea>
          </Tabs>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render with portal if triggerRef is provided, otherwise render inline
  if (triggerRef && mounted) {
    return createPortal(pickerContent, document.body);
  }

  return pickerContent;
}

