'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, Send, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import vi from 'date-fns/locale/vi';
import api from '@/lib/api';
import { Conversation, Message, User } from '@/types';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/contexts/SocketContext';

interface ChatPanelProps {
  conversationId: string | null;
  onConversationLoaded?: (conversation: Conversation | null) => void;
}

export function ChatPanel({ conversationId, onConversationLoaded }: ChatPanelProps) {
  const { user: currentUser } = useUser();
  const { socket, isConnected } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
      fetchMessages();
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  // Socket.io listeners for realtime messages
  useEffect(() => {
    if (!socket || !conversationId) return;

    console.log('📡 Setting up socket listeners for conversation:', conversationId);

    // Clear message IDs tracker when conversation changes
    messageIdsRef.current.clear();

    // Join conversation room
    socket.emit('join_conversation', conversationId);

    // Listen for join confirmation
    const handleJoinedConversation = (data: { conversation_id: string }) => {
      console.log('✅ Joined conversation room:', data.conversation_id);
    };

    // Listen for new messages
    const handleMessageReceived = (data: { message: Message; conversation_id: string }) => {
      console.log('✉️ Message received via socket:', {
        messageId: data.message._id,
        conversationId: data.conversation_id,
        currentConversationId: conversationId,
        sender: data.message.sender_id?.username || data.message.sender_id
      });
      
      // Check if message is for this conversation
      const messageConversationId = data.conversation_id?.toString();
      const currentConvId = conversationId?.toString();
      
      if (messageConversationId === currentConvId) {
        const messageId = data.message._id?.toString();
        
        // Use ref to track message IDs to prevent duplicates across re-renders
        if (messageIdsRef.current.has(messageId)) {
          console.log('⚠️ Duplicate message ignored (ref check):', messageId);
          return;
        }
        
        messageIdsRef.current.add(messageId);
        
        setMessages((prev) => {
          // Double check in state
          const exists = prev.some(m => m._id?.toString() === messageId);
          
          if (exists) {
            console.log('⚠️ Duplicate message ignored (state check):', messageId);
            return prev;
          }
          
          console.log('✅ Adding new message to state:', messageId);
          
          // Sort messages by created_at to ensure correct order
          const newMessages = [...prev, data.message].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateA - dateB;
          });
          
          return newMessages;
        });
      } else {
        console.log('⚠️ Message for different conversation, ignoring');
      }
    };

    // Listen for typing indicators
    const handleUserTyping = (data: { user_id: string; username: string; conversation_id: string }) => {
      if (data.conversation_id === conversationId && data.user_id !== currentUser?._id) {
        console.log('✏️ User typing:', data.username);
        setTypingUsers((prev) => new Set(prev).add(data.username));
      }
    };

    const handleUserStoppedTyping = (data: { user_id: string; conversation_id: string }) => {
      if (data.conversation_id === conversationId) {
        console.log('✅ User stopped typing:', data.user_id);
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          // Remove by user_id (we need to find username first)
          // For now, clear all typing indicators
          return new Set();
        });
      }
    };

    // Listen for user status changes
    const handleUserStatusChanged = (data: { user_id: string; is_online: boolean; last_seen: Date }) => {
      console.log('📡 User status changed:', data);
      
      // Update conversation if the status change is for a participant
      if (conversation) {
        setConversation((prev) => {
          if (!prev) return prev;
          
          // Check if the user is a participant in this conversation
          const isParticipant = prev.participants?.some(
            p => p.user_id?._id?.toString() === data.user_id
          );
          
          if (isParticipant) {
            // Update the participant's status
            return {
              ...prev,
              participants: prev.participants?.map(p => {
                if (p.user_id?._id?.toString() === data.user_id) {
                  return {
                    ...p,
                    user_id: {
                      ...p.user_id,
                      is_online: data.is_online,
                      last_seen: data.last_seen
                    }
                  };
                }
                return p;
              })
            };
          }
          
          return prev;
        });
      }
    };

    socket.on('joined_conversation', handleJoinedConversation);
    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('user_status_changed', handleUserStatusChanged);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up socket listeners for conversation:', conversationId);
      socket.off('joined_conversation', handleJoinedConversation);
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.emit('leave_conversation', conversationId);
      
      // Clear typing indicators
      setTypingUsers(new Set());
      setIsTyping(false);
    };
  }, [socket, conversationId, currentUser?._id, conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversation = async () => {
    if (!conversationId) {
      setConversation(null);
      onConversationLoaded?.(null);
      return;
    }
    
    try {
      const response = await api.get<{ conversation: Conversation }>(`/conversations/${conversationId}`);
      setConversation(response.data.conversation);
      onConversationLoaded?.(response.data.conversation);
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setConversation(null);
      onConversationLoaded?.(null);
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const response = await api.get<{ messages: Message[] }>(`/messages/conversation/${conversationId}`);
      const fetchedMessages = response.data.messages || [];
      
      // Remove duplicates by ID before setting state
      const uniqueMessages = fetchedMessages.filter((msg, index, self) => {
        const msgId = msg._id?.toString();
        if (!msgId) return true; // Keep messages without ID
        return index === self.findIndex(m => m._id?.toString() === msgId);
      });
      
      // Update ref tracker
      uniqueMessages.forEach(msg => {
        if (msg._id) {
          messageIdsRef.current.add(msg._id.toString());
        }
      });
      
      setMessages(uniqueMessages);
    } catch (error: any) {
      console.error('Error fetching messages:', error);
      
      // Show error if it's not just a network issue
      if (error?.response?.status) {
        alert(`Failed to load messages: ${error.response.data?.error || 'Unknown error'}`);
      } else if (!isConnected) {
        console.log('⚠️ Not connected, will retry when connection is restored');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending) return;

    const messageContent = message.trim();
    setSending(true);
    setMessage(''); // Clear input immediately for better UX
    
    // Stop typing indicator
    if (socket && conversationId) {
      socket.emit('stop_typing', { conversation_id: conversationId });
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    try {
      console.log('📤 Sending message:', { conversationId, content: messageContent });
      const response = await api.post<{ message: Message }>('/messages', {
        conversation_id: conversationId,
        content: messageContent,
        type: 'text',
      });

      const newMessage = response.data.message;
        const messageId = newMessage._id?.toString();
      console.log('✅ Message sent successfully:', messageId);
      
      // Track message ID
      if (messageId) {
        messageIdsRef.current.add(messageId);
      }
      
      // Optimistically add message to UI immediately
      // Socket will also emit, but we add it here in case socket is slow or fails
      setMessages((prev) => {
        // Check if already exists (socket might have already added it)
        const exists = prev.some(m => m._id?.toString() === messageId);
        
        if (exists) {
          console.log('⚠️ Message already in state (from socket), skipping optimistic update');
          return prev;
        }
        
        console.log('✅ Adding message optimistically:', messageId);
        
        // Sort to ensure correct order
        const newMessages = [...prev, newMessage].sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateA - dateB;
      });
        
        return newMessages;
      });
    } catch (error: any) {
      console.error('❌ Error sending message:', error);
      
      // Restore message on error
      setMessage(messageContent);
      
      // Better error messaging
      const errorMessage = error?.response?.data?.error || 
                          error?.message || 
                          'Failed to send message';
      
      // Check if it's a network error and socket is disconnected
      if (!isConnected) {
        alert('⚠️ Connection lost. Please wait while we reconnect...');
      } else if (error?.response?.status === 403) {
        alert('❌ You do not have permission to send messages in this conversation.');
      } else if (error?.response?.status === 404) {
        alert('❌ Conversation not found. Please refresh the page.');
      } else {
        alert(`❌ ${errorMessage}. Please try again.`);
      }
      
      // Retry logic: if network error and message not empty, save to retry queue
      // (For now, just restore the message - can be enhanced later)
    } finally {
      setSending(false);
    }
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !conversationId) return;

    // Send typing event
    if (!isTyping) {
      socket.emit('typing', { conversation_id: conversationId });
      setIsTyping(true);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { conversation_id: conversationId });
      setIsTyping(false);
    }, 3000);
  };

  const scrollToBottom = (smooth = false) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }
  };

  // Auto-scroll when new messages arrive
  useEffect(() => {
    // Scroll to bottom when messages change
    const timer = setTimeout(() => {
      scrollToBottom(true);
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages.length]);

  const getConversationName = (): string => {
    if (!conversation) return 'Unknown';
    
    if (conversation.type === 'direct') {
      const currentUserId = currentUser?._id?.toString();
      
      const otherParticipant = conversation.participants?.find(
        p => p.user_id?._id?.toString() !== currentUserId
      )?.user_id;
      return otherParticipant?.username || 'Unknown';
    }
    return conversation.name || 'Group Chat';
  };

  const getOtherParticipant = (): User | null => {
    if (!conversation || conversation.type !== 'direct') return null;
    
    const currentUserId = currentUser?._id?.toString();
    
    const otherParticipant = conversation.participants?.find(
      p => p.user_id?._id?.toString() !== currentUserId
    )?.user_id;
    
    return otherParticipant || null;
  };

  const isOwnMessage = (message: Message): boolean => {
    const currentUserId = currentUser?._id?.toString();
    return message.sender_id?._id?.toString() === currentUserId;
  };

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Select a conversation to start chatting</p>
      </div>
    );
  }

  if (!conversation || loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Loading conversation...</p>
      </div>
    );
  }

  const otherParticipant = getOtherParticipant();
  const conversationName = getConversationName();

  return (
    <div className="flex flex-col bg-white h-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0 z-10">
        {/* Connection status banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
            <span className="font-medium">⚠️ Reconnecting...</span> Messages may be delayed
          </div>
        )}
        
        <div className="h-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 rounded-[10px]">
              <AvatarImage src={otherParticipant?.avatar_url} />
              <AvatarFallback className="rounded-[10px] bg-gray-200">
                {conversationName[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-[20px] leading-[25px]">{conversationName}</h3>
              {conversation.type === 'direct' && otherParticipant && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    otherParticipant.is_online ? "bg-[#68D391]" : "bg-gray-400"
                  )} />
                  <span className="text-[12px] font-semibold text-gray-900 opacity-60">
                    {otherParticipant.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#615EF0]/10 rounded-lg hover:bg-[#615EF0]/20 transition-colors">
            <Phone className="w-6 h-6 text-[#615EF0]" strokeWidth={1.5} />
            <span className="text-[16px] font-semibold text-[#615EF0]">Call</span>
          </button>
        </div>
        <div className="h-px bg-black opacity-[0.08]" />
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef} 
        className="flex-1 px-6 py-6 bg-white overflow-y-scroll"
        style={{ minHeight: 0 }}
      >
        <div className="space-y-8">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              Chưa có tin nhắn nào. Bắt đầu cuộc trò chuyện!
            </div>
          ) : (
            messages.map((msg, index) => {
              const showDate = index === 0 || 
                new Date(msg.created_at).toDateString() !== 
                new Date(messages[index - 1].created_at).toDateString();
              const isOwn = isOwnMessage(msg);
              
              // Use unique key combining message ID and index to prevent duplicates
              const messageId = msg._id?.toString() || `temp-${index}`;
              const uniqueKey = `${messageId}-${index}`;
              
              // Group consecutive messages from same sender
              const prevMsg = messages[index - 1];
              const nextMsg = messages[index + 1];
              const sameSenderBefore = prevMsg && prevMsg.sender_id?._id === msg.sender_id?._id;
              const sameSenderAfter = nextMsg && nextMsg.sender_id?._id === msg.sender_id?._id;
              
              return (
                <div key={uniqueKey}>
                  {showDate && (
                    <div className="text-center text-xs text-gray-500 my-4">
                      {format(new Date(msg.created_at), 'dd/MM/yyyy', { locale: vi })}
                    </div>
                  )}
                  
                  <div className={cn('flex gap-4', isOwn ? 'flex-row-reverse' : 'flex-row', sameSenderBefore && 'mt-2.5')}>
                    {/* Only show avatar for other person's messages */}
                    {!isOwn && !sameSenderBefore && (
                      <Avatar className="h-10 w-10 flex-shrink-0 rounded-[8.33px]">
                        <AvatarImage src={msg.sender_id?.avatar_url} />
                        <AvatarFallback className="rounded-[8.33px] bg-gray-200">
                          {msg.sender_id?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isOwn && sameSenderBefore && <div className="w-10 flex-shrink-0" />}
                    
                    <div className={cn('flex flex-col gap-2.5', isOwn ? 'items-end' : 'items-start')}>
                      <div
                        className={cn(
                          'px-4 py-2 rounded-xl max-w-md',
                          isOwn
                            ? 'bg-[#615EF0] text-white'
                            : 'bg-[#F1F1F1] text-gray-900'
                        )}
                      >
                        {msg.content && <p className="text-[14px] leading-[21px]">{msg.content}</p>}
                        
                        {msg.file_info && (
                          <div className="mt-2">
                            <span className="text-sm">📎 {msg.file_info.filename || 'File'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Don't show avatar for own messages - standard chat UI pattern */}
                  </div>
                </div>
              );
            })
          )}
          
          {/* Typing indicator */}
          {typingUsers.size > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-500 italic">
              <div className="flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
              </div>
              <span>{Array.from(typingUsers).join(', ')} {typingUsers.size > 1 ? 'are' : 'is'} typing...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex items-center gap-6 px-6 py-6 flex-shrink-0 bg-white border-t border-gray-200 z-10">
        <button type="button" className="flex-shrink-0 text-gray-600 hover:text-gray-900 transition-colors">
          <Paperclip className="w-6 h-6" strokeWidth={1.5} />
        </button>
        
        <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-[10px] px-5 py-2.5 bg-white border-2 border-[#E2E8F0] rounded-xl">
          <input
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            className="flex-1 bg-transparent border-none outline-none text-[14px] leading-[21px] text-gray-900 placeholder:text-gray-900 placeholder:opacity-40"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sending}
            className={cn(
              "flex-shrink-0 transition-colors",
              message.trim() ? "text-[#615EF0] hover:text-[#615EF0]/80" : "text-gray-400"
            )}
          >
            <Send className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
