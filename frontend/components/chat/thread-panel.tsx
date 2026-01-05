'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Send, MessageCircle, Smile, Edit2, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { EmojiPicker } from '@/components/emoji/emoji-picker';
import { MessageReactions } from '@/components/chat/message-reactions';
import { cn } from '@/lib/utils';
import { Message, User } from '@/types';
import { format } from 'date-fns';
import { apiClient } from '@/lib/api-client';

interface ThreadPanelProps {
  parentMessage: Message;
  conversationId: string;
  currentUser: User | null;
  users: Map<string, { _id: string; username: string; avatar_url?: string }>;
  onClose: () => void;
  onSendReply: (content: string, threadId: string) => Promise<void>;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

export function ThreadPanel({
  parentMessage,
  conversationId: _conversationId,
  currentUser,
  users,
  onClose,
  onSendReply,
  onAddReaction,
  onRemoveReaction,
}: ThreadPanelProps) {
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [sending, setSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [threadName, setThreadName] = useState<string>('');
  const [isEditingThreadName, setIsEditingThreadName] = useState(false);
  const [threadNameInput, setThreadNameInput] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchThreadReplies();
  }, [parentMessage._id]);

  useEffect(() => {
    scrollToBottom();
  }, [replies]);

  // Auto-focus input when thread panel opens or when loading completes
  useEffect(() => {
    // Wait for loading to complete before attempting focus
    if (loading) return;
    
    // Use requestAnimationFrame and multiple attempts to ensure DOM is ready
    requestAnimationFrame(() => {
      const attemptFocus = (attempts: number) => {
        if (attempts <= 0) return;
        
        setTimeout(() => {
          if (inputRef.current) {
            // Check if element is in DOM and not disabled
            const element = inputRef.current;
            if (element.offsetParent !== null && !element.disabled && document.activeElement !== element) {
              element.focus();
              console.log('✅ Thread input focused (attempt:', 4 - attempts, ')');
            } else {
              // Retry if element not ready or already focused
              attemptFocus(attempts - 1);
            }
          } else {
            // Retry if ref not set
            attemptFocus(attempts - 1);
          }
        }, attempts === 3 ? 100 : attempts === 2 ? 300 : 500);
      };
      
      attemptFocus(3); // Try 3 times with increasing delays
    });
  }, [parentMessage._id, loading]); // Re-focus when thread changes or loading completes

  const fetchThreadReplies = async () => {
    try {
      setLoading(true);
      const threadId = typeof parentMessage._id === 'string' 
        ? parentMessage._id 
        : (parentMessage._id as any)?._id?.toString() || parentMessage._id?.toString();
      
      console.log('🔍 Fetching thread replies for threadId:', threadId, 'parentMessage:', parentMessage);
      
      const response = await apiClient.messages.getThreadReplies(threadId);
      console.log('📥 Thread replies response:', response);
      
      // Handle different response formats
      let threadReplies: Message[] = [];
      if ((response as any).data?.messages) {
        threadReplies = (response as any).data.messages;
      } else if ((response as any).messages) {
        threadReplies = (response as any).messages;
      } else if (Array.isArray((response as any).data)) {
        threadReplies = (response as any).data;
      } else if (Array.isArray(response)) {
        threadReplies = response as Message[];
      }
      
      const fetchedThreadName = (response as any).data?.thread_name || parentMessage.thread_name || '';
      
      console.log('📋 Parsed thread replies:', threadReplies.length, 'messages');
      
      // Populate sender_id username from users Map if missing
      const populatedReplies = threadReplies.map((reply: Message) => {
        if (reply.sender_id?._id && !reply.sender_id?.username) {
          const userFromMap = users.get(reply.sender_id._id.toString());
          if (userFromMap) {
            return {
              ...reply,
              sender_id: {
                ...reply.sender_id,
                username: userFromMap.username,
                avatar_url: userFromMap.avatar_url || reply.sender_id.avatar_url,
              }
            };
          }
        }
        return reply;
      });
      
      console.log('✅ Setting replies:', populatedReplies.length, 'messages');
      setReplies(populatedReplies);
      setThreadName(fetchedThreadName);
    } catch (error) {
      console.error('❌ Error fetching thread replies:', error);
      setReplies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateThreadName = async () => {
    if (!threadNameInput.trim()) {
      setIsEditingThreadName(false);
      setThreadNameInput('');
      return;
    }

    try {
      await apiClient.messages.updateThreadName(parentMessage._id, threadNameInput.trim());
      setThreadName(threadNameInput.trim());
      setIsEditingThreadName(false);
      setThreadNameInput('');
    } catch (error) {
      console.error('Error updating thread name:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim() || sending) return;

    const content = replyContent.trim();
    setSending(true);
    setReplyContent('');

    try {
      await onSendReply(content, parentMessage._id);
      // Refetch to get the new reply
      await fetchThreadReplies();
    } catch (error) {
      console.error('Error sending reply:', error);
      setReplyContent(content);
    } finally {
      setSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || replyContent.length;
      const end = input.selectionEnd || replyContent.length;
      const newValue = replyContent.slice(0, start) + emoji + replyContent.slice(end);
      setReplyContent(newValue);
      
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setReplyContent(replyContent + emoji);
    }
    setShowEmojiPicker(false);
  };

  const isOwnMessage = (message: Message): boolean => {
    return message.sender_id?._id?.toString() === currentUser?._id?.toString();
  };

  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'HH:mm');
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="absolute inset-y-0 right-0 w-[400px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl z-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <MessageCircle className="h-5 w-5 text-[#615EF0] flex-shrink-0" />
          {isEditingThreadName ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                type="text"
                value={threadNameInput}
                onChange={(e) => setThreadNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateThreadName();
                  if (e.key === 'Escape') {
                    setIsEditingThreadName(false);
                    setThreadNameInput('');
                  }
                }}
                autoFocus
                className="flex-1 px-2 py-1 text-sm font-semibold bg-transparent border border-[#615EF0] rounded text-gray-900 dark:text-gray-100 outline-none"
                placeholder="Thread name..."
                maxLength={100}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUpdateThreadName}
                className="h-6 w-6 text-green-600 hover:text-green-700"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setIsEditingThreadName(false);
                  setThreadNameInput('');
                }}
                className="h-6 w-6 text-gray-600 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {threadName || 'Thread'}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsEditingThreadName(true);
                    setThreadNameInput(threadName);
                  }}
                  className="h-6 w-6 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full flex-shrink-0">
                {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
              </span>
            </>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={parentMessage.sender_id?.avatar_url} />
            <AvatarFallback className="text-xs">
              {parentMessage.sender_id?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {parentMessage.sender_id?.username || 
                 (parentMessage.sender_id?._id ? users.get(parentMessage.sender_id._id.toString())?.username : null) || 
                 'Unknown'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatTime(parentMessage.created_at)}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">
              {parentMessage.content}
            </p>
            
            {parentMessage.reactions && parentMessage.reactions.length > 0 && (
              <MessageReactions
                reactions={parentMessage.reactions}
                currentUserId={currentUser?._id || ''}
                users={users}
                onAddReaction={(emoji) => onAddReaction(parentMessage._id, emoji)}
                onRemoveReaction={(emoji) => onRemoveReaction(parentMessage._id, emoji)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Replies */}
      <ScrollArea className="flex-1 px-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-[#615EF0] border-t-transparent" />
          </div>
        ) : replies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">No replies yet</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Be the first to reply!</p>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            {replies.map((reply, index) => {
              const isOwn = isOwnMessage(reply);
              
              return (
                <motion.div
                  key={reply._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    'flex gap-3',
                    isOwn ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={reply.sender_id?.avatar_url} />
                    <AvatarFallback className="text-[10px]">
                      {reply.sender_id?.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                    <div className={cn('flex flex-col max-w-[280px]', isOwn ? 'items-end' : 'items-start')}>
                    <div className={cn('flex items-center gap-2 mb-1', isOwn && 'flex-row-reverse')}>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {reply.sender_id?.username || 
                         (reply.sender_id?._id ? users.get(reply.sender_id._id.toString())?.username : null) || 
                         'Unknown'}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">
                        {formatTime(reply.created_at)}
                      </span>
                    </div>
                    
                    <div
                      className={cn(
                        'px-3 py-2 rounded-xl text-sm break-words',
                        isOwn
                          ? 'bg-[#615EF0] text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                      )}
                    >
                      {reply.content}
                      {reply.is_edited && (
                        <span className={cn(
                          'text-[10px] ml-1 italic',
                          isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400'
                        )}>
                          (edited)
                        </span>
                      )}
                    </div>
                    
                    {reply.reactions && reply.reactions.length > 0 && (
                      <MessageReactions
                        reactions={reply.reactions}
                        currentUserId={currentUser?._id || ''}
                        users={users}
                        onAddReaction={(emoji) => onAddReaction(reply._id, emoji)}
                        onRemoveReaction={(emoji) => onRemoveReaction(reply._id, emoji)}
                        isOwnMessage={isOwn}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Reply Input */}
      <form
        onSubmit={handleSendReply}
        className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
          <input
            ref={inputRef}
            type="text"
            placeholder="Reply to thread..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            disabled={sending}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
          />
          
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                'p-1 rounded-full transition-colors',
                showEmojiPicker ? 'text-[#615EF0]' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
              )}
              disabled={sending}
            >
              <Smile className="h-4 w-4" />
            </button>
            
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect}
            />
          </div>
          
          <button
            type="submit"
            disabled={!replyContent.trim() || sending}
            className={cn(
              'p-1 rounded-full transition-colors',
              replyContent.trim()
                ? 'text-[#615EF0] hover:text-[#615EF0]/80'
                : 'text-gray-300 dark:text-gray-600'
            )}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </motion.div>
  );
}
