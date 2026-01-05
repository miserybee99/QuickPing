'use client';

import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FileIcon, ImageIcon, VideoIcon, FileAudioIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Message } from '@/types';

interface QuotedMessageProps {
  message: Message;
  onClick?: () => void;
  isOwnMessage?: boolean;
  showInBubble?: boolean;
  usersMap?: Map<string, { _id: string; username: string; avatar_url?: string }>;
}

export function QuotedMessage({
  message,
  onClick,
  isOwnMessage = false,
  showInBubble = false,
  usersMap,
}: QuotedMessageProps) {
  // Get sender name from message or usersMap
  const getSenderName = (): string => {
    if (message.sender_id?.username) {
      return message.sender_id.username;
    }
    if (message.sender_id?._id && usersMap) {
      const user = usersMap.get(message.sender_id._id.toString());
      if (user?.username) {
        return user.username;
      }
    }
    return 'Unknown';
  };
  
  const senderName = getSenderName();
  const avatarUrl = message.sender_id?.avatar_url || 
    (message.sender_id?._id && usersMap?.get(message.sender_id._id.toString())?.avatar_url);

  // Get content preview (max 2 lines / ~100 chars)
  const getContentPreview = (): string => {
    if (message.content) {
      const content = message.content.trim();
      if (content.length > 100) {
        return content.substring(0, 100) + '...';
      }
      return content;
    }
    
    if (message.file_info) {
      const mimeType = message.file_info.mime_type || '';
      if (mimeType.startsWith('image/')) {
        return '📷 Photo';
      } else if (mimeType.startsWith('video/')) {
        return '🎬 Video';
      } else if (mimeType.startsWith('audio/')) {
        return '🎵 Audio';
      } else {
        return `📎 ${message.file_info.filename || 'File'}`;
      }
    }
    
    return 'Message';
  };

  const getFileIcon = () => {
    if (!message.file_info) return null;
    
    const mimeType = message.file_info.mime_type || '';
    const iconClass = cn(
      'h-4 w-4 flex-shrink-0',
      isOwnMessage && showInBubble ? 'text-white/70' : 'text-gray-500'
    );
    
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className={iconClass} />;
    } else if (mimeType.startsWith('video/')) {
      return <VideoIcon className={iconClass} />;
    } else if (mimeType.startsWith('audio/')) {
      return <FileAudioIcon className={iconClass} />;
    }
    return <FileIcon className={iconClass} />;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-lg p-2 border-l-2 transition-colors',
        showInBubble
          ? isOwnMessage
            ? 'bg-white/10 border-white/50 hover:bg-white/15'
            : 'bg-black/5 border-gray-400 hover:bg-black/10'
          : 'bg-gray-100 border-[#615EF0] hover:bg-gray-150'
      )}
    >
      <div className="flex items-start gap-2">
        {!showInBubble && (
          <Avatar className="h-5 w-5 flex-shrink-0 mt-0.5">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="text-[10px]">
              {senderName[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className="flex-1 min-w-0 overflow-hidden">
          <p className={cn(
            'text-xs font-semibold truncate',
            showInBubble
              ? isOwnMessage ? 'text-white/90' : 'text-gray-700'
              : 'text-[#615EF0]'
          )}>
            {senderName}
          </p>
          
          <div className="flex items-center gap-1.5 mt-0.5">
            {message.file_info && !message.content && getFileIcon()}
            <p className={cn(
              'text-xs line-clamp-2',
              showInBubble
                ? isOwnMessage ? 'text-white/70' : 'text-gray-600'
                : 'text-gray-600'
            )}>
              {getContentPreview()}
            </p>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
