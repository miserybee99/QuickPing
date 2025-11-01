'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, LogOut } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import { Conversation } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';
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

    socket.on('message_received', handleMessageReceived);

    return () => {
      console.log('🔌 Cleaning up conversation list socket listeners');
      socket.off('message_received', handleMessageReceived);
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
      const response = await api.get<{ conversations: Conversation[] }>('/conversations');
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
      // Create or get direct conversation with selected user
      const response = await api.post<{ conversation: Conversation }>('/conversations/direct', { userId });
      const conversation = response.data.conversation;
      
      // Refresh conversations list
      await fetchConversations();
      
      // Select the new/existing conversation
      onSelect(conversation._id);
    } catch (error) {
      console.error('Error creating direct conversation:', error);
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
      return formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi });
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
    <div className="w-[380px] border-r flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Badge variant="secondary" className="rounded-full">
              {conversations.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full h-10 w-10"
              onClick={() => setSearchDialogOpen(true)}
              title="Tin nhắn mới"
            >
              <Plus className="h-5 w-5" />
            </Button>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full h-10 w-10 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              onClick={handleLogout}
              title="Đăng xuất"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages"
            className="pl-10 bg-muted/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
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
                    'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedId === conv._id && 'bg-muted'
                  )}
                >
                  <div className="flex gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage 
                        src={
                          conv.type === 'direct'
                            ? conv.participants?.find(p => p.user_id?.username !== name)?.user_id?.avatar_url
                            : undefined
                        } 
                      />
                      <AvatarFallback>{name[0]?.toUpperCase() || 'U'}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm truncate">
                          {name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo}
                        </span>
                      </div>
                      
                      <p className="text-sm text-muted-foreground truncate mb-2">
                        {lastMessage}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Search Users Dialog */}
      <SearchUsersDialog 
        open={searchDialogOpen}
        onOpenChange={setSearchDialogOpen}
        onSelectUser={handleSelectUser}
      />
    </div>
  );
}
