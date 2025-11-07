'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, Send, Paperclip } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { socket } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

    // Join conversation room
    socket.emit('join_conversation', conversationId);

    // Listen for new messages
    const handleMessageReceived = (data: { message: Message; conversation_id: string }) => {
      console.log('✉️ Message received:', data);
      if (data.conversation_id === conversationId) {
        setMessages((prev) => {
          // Check if message already exists (avoid duplicates)
          const messageId = data.message._id?.toString();
          const exists = prev.some(m => m._id?.toString() === messageId);
          if (exists) {
            console.log('⚠️ Duplicate message ignored:', messageId);
            return prev;
          }
          return [...prev, data.message];
        });
      }
    };

    socket.on('message_received', handleMessageReceived);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up socket listeners');
      socket.off('message_received', handleMessageReceived);
      socket.emit('leave_conversation', conversationId);
    };
  }, [socket, conversationId]);

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
      
      setMessages(uniqueMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      const response = await api.post<{ message: Message }>('/messages', {
        conversation_id: conversationId,
        content: message.trim(),
        type: 'text',
      });

      // Don't add message here - let Socket.io event handle it to avoid duplicates
      // The socket event will add the message to the list
      const newMessage = response.data.message;
      setMessages(prev => {
        // Check if already exists (in case socket is slow)
        const messageId = newMessage._id?.toString();
        const exists = prev.some(m => m._id?.toString() === messageId);
        if (exists) {
          console.log('⚠️ Message already exists, skipping:', messageId);
          return prev;
        }
        return [...prev, newMessage];
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

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
              {conversation.type === 'direct' && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-[#68D391]" />
                  <span className="text-[12px] font-semibold text-gray-900 opacity-60">
                    Online
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

                    {isOwn && !sameSenderAfter && (
                      <Avatar className="h-10 w-10 flex-shrink-0 rounded-[8.33px]">
                        <AvatarImage src={currentUser?.avatar_url} />
                        <AvatarFallback className="rounded-[8.33px] bg-gray-200">
                          {currentUser?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {isOwn && sameSenderAfter && <div className="w-10 flex-shrink-0" />}
                  </div>
                </div>
              );
            })
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
            onChange={(e) => setMessage(e.target.value)}
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
