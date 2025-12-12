'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { getFileUrl } from '@/lib/file-utils';
import api from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import { Conversation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/contexts/SocketContext';
import { SearchUsersDialog } from './search-users-dialog';
import { Message } from '@/types';

interface MessagesPanelProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MessagesPanel({ selectedId, onSelect }: MessagesPanelProps) {
  const router = useRouter();
  const { user, isClient } = useUser();
  const { socket } = useSocket();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);

  useEffect(() => {
    // Only fetch conversations after client-side hydration and user is loaded
    if (isClient && user) {
      fetchConversations();
    }
  }, [isClient, user]);

  // Socket.io listener for realtime conversation updates
  useEffect(() => {
    if (!socket) return;

    console.log('📡 Setting up socket listeners for conversation list');

    // Listen for new messages to update conversation list
    const handleMessageReceived = (data: { message: Message; conversation_id: string }) => {
      console.log('✉️ Conversation list received message event:', data);
      
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === data.conversation_id) {
            // Update last_message and timestamp
            return {
              ...conv,
              last_message: data.message,
              updated_at: data.message.created_at,
            };
          }
          return conv;
        }).sort((a, b) => {
          // Sort by updated_at (most recent first)
          const aTime = new Date(a.updated_at || a.created_at).getTime();
          const bTime = new Date(b.updated_at || b.created_at).getTime();
          return bTime - aTime;
        });
      });
    };

    // Listen for user status changes
    const handleUserStatusChanged = (data: { user_id: string; is_online: boolean; last_seen: Date }) => {
      console.log('📡 User status changed in conversation list:', data);
      
      setConversations((prev) => {
        return prev.map((conv) => {
          // Update participant status if they're in this conversation
          const hasParticipant = conv.participants?.some(
            p => p.user_id?._id?.toString() === data.user_id
          );
          
          if (hasParticipant) {
            return {
              ...conv,
              participants: conv.participants?.map(p => {
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
          
          return conv;
        });
      });
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_status_changed', handleUserStatusChanged);

    return () => {
      console.log('🔌 Cleaning up conversation list socket listeners');
      socket.off('message_received', handleMessageReceived);
      socket.off('user_status_changed', handleUserStatusChanged);
    };
  }, [socket]);

  const fetchConversations = async () => {
    // Check if token exists before making request
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      console.warn('⚠️ No token found, skipping conversations fetch');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('📡 Fetching conversations with token:', token.substring(0, 20) + '...');
      const response = await apiClient.conversations.getAll();
      setConversations(response.data.conversations || []);
    } catch (error: any) {
      console.error('Error fetching conversations:', error);
      if (error.response?.status === 401) {
        // Token is invalid, clear it
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage regardless of API call result
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      router.push('/login');
    }
  };

  const handleSelectUser = async (userId: string) => {
    try {
      console.log('👤 Creating/getting direct conversation with user:', userId);
      
      // Create or get direct conversation with selected user
      const response = await apiClient.conversations.createDirect(userId);
      const conversation = response.data.conversation;
      
      console.log('✅ Conversation created/retrieved:', conversation._id);
      
      // Refresh conversations list to show the new conversation
      await fetchConversations();
      
      // Select the new/existing conversation
      onSelect(conversation._id);
      
      console.log('✅ Conversation selected:', conversation._id);
    } catch (error: any) {
      console.error('❌ Error creating direct conversation:', error);
      
      // Better error messaging
      const errorMessage = error?.response?.data?.error || 
                          error?.message || 
                          'Failed to create conversation';
      alert(`❌ ${errorMessage}`);
    }
  };

  const getConversationName = (conv: Conversation, currentUserId?: string): string => {
    if (conv.type === 'direct') {
      const otherParticipant = conv.participants?.find(
        p => p.user_id?._id?.toString() !== currentUserId
      )?.user_id;
      return otherParticipant?.username || 'Unknown';
    }
    return conv.name || 'Group Chat';
  };

  const getLastMessagePreview = (conv: Conversation): string => {
    if (!conv.last_message) return 'No messages yet';
    if (conv.last_message.type === 'file' || conv.last_message.type === 'image') {
      return '📎 File';
    }
    return conv.last_message.content || 'No content';
  };

  const getTimeAgo = (date: Date | string): string => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: enUS });
    } catch {
      return '';
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const name = getConversationName(conv, user?._id).toLowerCase();
    const message = getLastMessagePreview(conv).toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || message.includes(searchQuery.toLowerCase());
  });

  if (loading) {
    return (
      <div className="w-[380px] border-r flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="border-r border-gray-200 flex flex-col bg-white shadow-[1px_0px_0px_0px_rgba(0,0,0,0.08)] h-full">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-[10px]">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[20px] font-semibold">Messages</h2>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-800">
                <path d="M2.72 5.97L8 10.56L13.28 5.97" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="px-2 py-0.5 bg-[#EDF2F7] rounded-[24px]">
              <span className="text-[12px] font-semibold">{conversations.length}</span>
            </div>
          </div>
          <button 
            onClick={() => setSearchDialogOpen(true)}
            className="w-10 h-10 flex items-center justify-center bg-[#615EF0]/10 text-[#615EF0] hover:bg-[#615EF0]/20 rounded-full transition-colors"
            title="New message"
          >
            <Plus className="w-6 h-6 stroke-[2]" />
          </button>
        </div>
        <div className="h-px bg-black opacity-[0.08]" />
        
        {/* Search */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-[10px] px-5 py-2.5 bg-[#F3F3F3] rounded-xl">
            <Search className="h-3.5 w-3.5 text-gray-600 opacity-40" />
            <input
              type="text"
              placeholder="Search messages"
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 opacity-40 placeholder:text-gray-600"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 space-y-2">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const name = getConversationName(conv, user?._id);
              const lastMessage = getLastMessagePreview(conv);
              const timeAgo = getTimeAgo(conv.updated_at || conv.created_at);
              
              return (
                <div
                  key={conv._id}
                  onClick={() => onSelect(conv._id)}
                  className={cn(
                    'flex gap-4 p-3 cursor-pointer rounded-xl transition-all',
                    selectedId === conv._id 
                      ? 'bg-[#615EF0]/6' 
                      : 'hover:bg-[#615EF0]/6'
                  )}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl">
                    <AvatarImage 
                      src={
                        conv.type === 'direct'
                          ? getFileUrl(conv.participants?.find(p => p.user_id?._id !== user?._id)?.user_id?.avatar_url)
                          : undefined
                      } 
                    />
                    <AvatarFallback className="rounded-xl bg-gray-200">
                      {name[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="font-semibold text-[14px] leading-[21px] truncate">
                        {name}
                      </span>
                      <span className="text-[14px] font-semibold text-gray-900 opacity-30 flex-shrink-0">
                        {timeAgo}
                      </span>
                    </div>
                    
                    <p className="text-[14px] leading-[21px] text-gray-900 opacity-40 truncate mb-2">
                      {lastMessage}
                    </p>

                    {/* Badges */}
                    {conv.type === 'group' && (
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-[#FEEBC8] text-[#DD6B20] text-[12px] font-semibold rounded-xl">
                          Group
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Search Users Dialog */}
      <SearchUsersDialog 
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
