'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Reaction {
  emoji: string;
  count: number;
  users: {
    _id: string;
    username: string;
    avatar_url?: string;
  }[];
  hasReacted: boolean;
}

interface ReactionViewerProps {
  reactions: Reaction[];
  onReactionClick: (emoji: string) => void;
  onAddReaction: () => void;
}

export function ReactionViewer({
  reactions,
  onReactionClick,
  onAddReaction
}: ReactionViewerProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 mt-1">
      <AnimatePresence>
        {reactions.map((reaction) => (
          <Popover key={reaction.emoji}>
            <PopoverTrigger asChild>
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm border transition-colors ${
                  reaction.hasReacted
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/50 border-transparent hover:border-primary/30'
                }`}
                onClick={() => onReactionClick(reaction.emoji)}
              >
                <span className="text-base">{reaction.emoji}</span>
                <span className="text-xs font-medium">{reaction.count}</span>
              </motion.button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" side="top">
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <span className="text-xl">{reaction.emoji}</span>
                <span>{reaction.count} {reaction.count === 1 ? 'person' : 'people'}</span>
              </p>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {reaction.users.map((user) => (
                    <div key={user._id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.username}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        ))}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onAddReaction}
        className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-muted/50 hover:bg-muted transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
      </motion.button>
    </div>
  );
}

