'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, LogOut } from 'lucide-react';
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
  const fetchConversationsRef = useRef<(() => Promise<void>) | null>(null);
  
  // Use refs to track userId and selectedId to avoid re-setting listeners
  const userIdRef = useRef<string | null>(null);
  const selectedIdRef = useRef<string | null>(null);
  
  // Update refs when values change
  useEffect(() => {
    userIdRef.current = user?._id?.toString() ?? null;
  }, [user?._id]);
  
  useEffect(() => {
    selectedIdRef.current = selectedId ?? null;
  }, [selectedId]);

  const fetchConversations = useCallback(async () => {
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
      const conversations = response.data.conversations || [];
      setConversations(conversations);
      
      // Join socket rooms for all conversations to ensure real-time updates
      if (socket && conversations.length > 0) {
        console.log(`🔌 Joining ${conversations.length} conversation rooms...`);
        conversations.forEach(conv => {
          if (conv._id) {
            socket.emit('join_conversation', conv._id);
            console.log(`   ✅ Joined room: conversation_${conv._id}`);
          }
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      
      // Log detailed error information
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      } else if (error.request) {
        console.error('   No response received. Is backend running?');
        console.error('   Request:', error.request);
      } else {
        console.error('   Error message:', error.message);
      }
      
      if (error.response?.status === 401) {
        // Token is invalid, clear it
        console.warn('⚠️ Token expired or invalid, clearing auth data');
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        router.push('/login');
      } else if (!error.response) {
        // Network error - backend might not be running
        console.error('🚨 Cannot connect to backend. Please check if backend server is running.');
        setConversations([]); // Clear conversations on error
      }
    } finally {
      setLoading(false);
    }
  }, [socket]);

  // Store fetchConversations in ref to avoid stale closure
  useEffect(() => {
    fetchConversationsRef.current = fetchConversations;
  }, [fetchConversations]);

  useEffect(() => {
    // Only fetch conversations after client-side hydration and user is loaded
    if (isClient && user) {
      fetchConversations();
    }
  }, [isClient, user, fetchConversations]);

  // Ensure socket joins ALL conversation rooms to receive real-time messages
  // This runs whenever conversations list changes to ensure we're always in all rooms
  useEffect(() => {
    if (!socket || !conversations.length) return;
    
    console.log(`🔌 Ensuring socket joins ALL ${conversations.length} conversation rooms for real-time updates...`);
    const joinedRooms = new Set<string>();
    
    conversations.forEach(conv => {
      if (conv._id) {
        const conversationId = conv._id.toString();
        if (!joinedRooms.has(conversationId)) {
          // Always join - even if already in room, it's safe to re-join
          socket.emit('join_conversation', conversationId);
          joinedRooms.add(conversationId);
          console.log(`   ✅ Joined room: conversation_${conversationId}`);
        }
      }
    });
  }, [socket, conversations]); // Re-run when conversations list changes (not just length)

  // Mark selected conversation as read (update local state for immediate UI feedback)
  useEffect(() => {
    if (!selectedId || !user?._id) return;
    
    // When user selects a conversation, mark it as read locally
    // This provides immediate UI feedback without waiting for socket events
    const timer = setTimeout(() => {
      setConversations((prev) => {
        return prev.map((conv) => {
          if (conv._id === selectedId && conv.last_message) {
            // Check if current user already read it
            const alreadyRead = conv.last_message.read_by?.some(
              r => (typeof r.user_id === 'string' ? r.user_id : r.user_id?._id) === user._id
            );
            
            if (!alreadyRead) {
              return {
                ...conv,
                last_message: {
                  ...conv.last_message,
                  read_by: [
                    ...(conv.last_message.read_by || []),
                    { user_id: user._id, read_at: new Date() }
                  ]
                }
              };
            }
          }
          return conv;
        });
      });
    }, 500); // Wait 500ms for the chat to load and mark as read
    
    return () => clearTimeout(timer);
  }, [selectedId, user?._id]);

  // Socket.io listener for realtime conversation updates
  useEffect(() => {
    if (!socket) {
      console.log('⚠️ Socket not available, skipping listener setup');
      return;
    }

    console.log('📡 Setting up socket listeners for conversation list');

    // Listen for new messages to update conversation list
    const handleMessageReceived = (data: { message: Message; conversation_id: string }) => {
      console.log('✉️ Conversation list received message event:', data);
      console.log('   Message data:', {
        messageId: data.message._id,
        conversationId: data.conversation_id,
        sender: data.message.sender_id?.username || data.message.sender_id,
        content: data.message.content
      });
      
      setConversations((prev) => {
        console.log(`   Current conversations count: ${prev.length}`);
        
        // Check if conversation exists in list
        const existingConv = prev.find(conv => {
          const convId = conv._id?.toString();
          const messageConvId = data.conversation_id?.toString();
          return convId === messageConvId;
        });
        
        console.log(`   Conversation exists in list: ${!!existingConv}`);
        
        if (existingConv) {
          // Update existing conversation
          console.log('   ✅ Updating existing conversation in list');
          return prev.map((conv) => {
            if (conv._id?.toString() === data.conversation_id?.toString()) {
              // Update last_message and timestamp
              // If this is the current conversation and input is focused, mark message as read
              const currentUserId = userIdRef.current;
              const currentSelectedId = selectedIdRef.current;
              
              const senderId = data.message.sender_id?._id?.toString() || data.message.sender_id?.toString();
              const isFromOtherUser = senderId && currentUserId && senderId !== currentUserId;
              
              // Check if conversation is selected (user is viewing it)
              const isSelected = currentSelectedId && conv._id && currentSelectedId === conv._id.toString();
              
              // If message is from other user and conversation is selected, mark as read
              let updatedMessage = data.message;
              if (isFromOtherUser && isSelected && currentUserId) {
                // Check if already read
                const alreadyRead = data.message.read_by?.some(
                  (r: any) => {
                    const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                    return readUserId === currentUserId;
                  }
                );
                
                if (!alreadyRead) {
                  // Optimistically mark as read in conversation list
                  updatedMessage = {
                    ...data.message,
                    read_by: [
                      ...(data.message.read_by || []),
                      { user_id: currentUserId, read_at: new Date() }
                    ]
                  };
                  console.log('   👁️ Conversation is selected, marking new message as read in list');
                }
              }
              
              return {
                ...conv,
                last_message: updatedMessage,
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
        } else {
          // Conversation not in list - fetch all conversations
          console.log('📥 Conversation not in list, will refresh conversations list...');
          console.log(`   Missing conversation ID: ${data.conversation_id}`);
          
          // Also join the conversation room immediately to receive future messages
          if (socket && data.conversation_id) {
            console.log(`   🔌 Joining conversation room: conversation_${data.conversation_id}`);
            socket.emit('join_conversation', data.conversation_id);
          }
          
          // Use setTimeout to avoid calling fetchConversations inside setState
          setTimeout(() => {
            console.log('   🔄 Fetching conversations...');
            if (fetchConversationsRef.current) {
              fetchConversationsRef.current();
            }
          }, 100);
          
          // Return current list while fetching
          return prev;
        }
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
    
    // Listen for message read receipts to update unread status (bulk)
    const handleMessagesReadReceipt = (data: { 
      user_id: string; 
      conversation_id: string; 
      message_ids: string[];
      read_at: Date;
    }) => {
      console.log('📖 Messages read receipt in conversation list:', data);
      
      // Only update if it's for the current user (when they mark messages as read)
      const currentUserId = userIdRef.current;
      if (!currentUserId || data.user_id !== currentUserId) {
        console.log('   ⏭️ Skipping - not for current user');
        return;
      }
      
      setConversations((prev) => {
        return prev.map((conv) => {
          const convId = conv._id?.toString();
          const dataConvId = data.conversation_id?.toString();
          
          if (convId && dataConvId && convId === dataConvId && conv.last_message) {
            // Convert message_ids and last_message._id to strings for comparison
            const lastMessageId = conv.last_message._id?.toString();
            const messageIds = data.message_ids.map((id: any) => id?.toString());
            
            // Check if the read message is the last message
            if (lastMessageId && messageIds.includes(lastMessageId)) {
              const alreadyRead = conv.last_message.read_by?.some(
                (r: any) => {
                  const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                  return readUserId === currentUserId;
                }
              );
              
              if (!alreadyRead && currentUserId) {
                console.log('   ✅ Updating last_message read_by for conversation:', conv._id);
                return {
                  ...conv,
                  last_message: {
                    ...conv.last_message,
                    read_by: [
                      ...(conv.last_message.read_by || []),
                      { user_id: currentUserId, read_at: new Date(data.read_at) }
                    ]
                  }
                };
              }
            }
          }
          return conv;
        });
      });
    };
    
    // Listen for single read receipt to update unread status
    const handleReadReceipt = (data: { 
      user_id: string; 
      message_id: string;
      conversation_id: string; 
      read_at: Date;
    }) => {
      console.log('📖 Single read receipt in conversation list:', data);
      
      // Only update if it's for the current user (when they mark a message as read)
      const currentUserId = userIdRef.current;
      if (!currentUserId || data.user_id !== currentUserId) {
        console.log('   ⏭️ Skipping - not for current user');
        return;
      }
      
      setConversations((prev) => {
        return prev.map((conv) => {
          const convId = conv._id?.toString();
          const dataConvId = data.conversation_id?.toString();
          const lastMessageId = conv.last_message?._id?.toString();
          const dataMessageId = data.message_id?.toString();
          
          if (convId && dataConvId && convId === dataConvId && conv.last_message) {
            // Check if the read message is the last message
            if (lastMessageId && dataMessageId && lastMessageId === dataMessageId) {
              const alreadyRead = conv.last_message.read_by?.some(
                (r: any) => {
                  const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                  return readUserId === currentUserId;
                }
              );
              
              if (!alreadyRead && currentUserId) {
                console.log('   ✅ Updating last_message read_by for conversation:', conv._id);
                return {
                  ...conv,
                  last_message: {
                    ...conv.last_message,
                    read_by: [
                      ...(conv.last_message.read_by || []),
                      { user_id: currentUserId, read_at: new Date(data.read_at) }
                    ]
                  }
                };
              }
            }
          }
          return conv;
        });
      });
    };

    // Listen for conversation updates (participant removal, role changes, etc.)
    const handleConversationUpdated = (data: any) => {
      console.log('📡 Conversation updated in conversation list:', data);
      
      if (data.conversation && data.type) {
        const conversationId = data.conversation._id?.toString();
        
        // Handle participant removal
        if (data.type === 'participant_removed') {
          const currentUserId = userIdRef.current;
          
          // If current user was removed, remove conversation from list
          if (data.removed_user_id === currentUserId && conversationId) {
            console.log('👤 Current user was removed from conversation, removing from list');
            setConversations((prev) => prev.filter(conv => conv._id?.toString() !== conversationId));
            
            // If this conversation was selected, deselect it
            if (selectedId === conversationId) {
              onSelect('');
            }
            return;
          }
          
          // If someone else was removed, update the conversation with new participants
          setConversations((prev) => {
            return prev.map((conv) => {
              if (conv._id?.toString() === conversationId) {
                console.log('👤 Participant removed from conversation, updating participants list');
                return {
                  ...conv,
                  participants: data.conversation.participants || conv.participants
                };
              }
              return conv;
            });
          });
        }
        
        // Handle participant addition - update conversation participants
        if (data.type === 'participant_added') {
          const currentUserId = userIdRef.current;
          const addedUserIds = data.added_user_ids || [];
          
          // Check if current user was added to this conversation
          const wasUserAdded = currentUserId && addedUserIds.includes(currentUserId);
          
          setConversations((prev) => {
            const existingConv = prev.find(conv => conv._id?.toString() === conversationId);
            
            // If current user was added and conversation doesn't exist in list, add it
            if (wasUserAdded && !existingConv) {
              console.log('👤 Current user was added to conversation, adding to list');
              
              // Join conversation room immediately to receive messages
              if (socket && conversationId) {
                console.log(`   🔌 Joining conversation room: conversation_${conversationId}`);
                socket.emit('join_conversation', conversationId);
              }
              
              // Add conversation to list
              return [...prev, data.conversation].sort((a, b) => {
                const aTime = new Date(a.updated_at || a.created_at).getTime();
                const bTime = new Date(b.updated_at || b.created_at).getTime();
                return bTime - aTime;
              });
            }
            
            // If conversation exists, update participants
            if (existingConv) {
              console.log('👤 Participant(s) added to conversation, updating participants');
              return prev.map((conv) => {
                if (conv._id?.toString() === conversationId) {
                  return {
                    ...conv,
                    participants: data.conversation.participants || conv.participants
                  };
                }
                return conv;
              });
            }
            
            return prev;
          });
        }
        
        // Handle role changes - update conversation participants
        if (data.type === 'role_change') {
          setConversations((prev) => {
            return prev.map((conv) => {
              if (conv._id?.toString() === conversationId) {
                console.log('👤 Role changed in conversation, updating participants');
                return {
                  ...conv,
                  participants: data.conversation.participants || conv.participants
                };
              }
              return conv;
            });
          });
        }
      }
    };

    socket.on('message_received', handleMessageReceived);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('messages_read_receipt', handleMessagesReadReceipt);
    socket.on('read_receipt', handleReadReceipt);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      console.log('🔌 Cleaning up conversation list socket listeners');
      socket.off('message_received', handleMessageReceived);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('messages_read_receipt', handleMessagesReadReceipt);
      socket.off('read_receipt', handleReadReceipt);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket]); // Only re-setup when socket changes to avoid missing messages

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
      
      // Join conversation room immediately to receive messages
      if (socket && conversation._id) {
        console.log(`🔌 Joining conversation room: conversation_${conversation._id}`);
        socket.emit('join_conversation', conversation._id);
      }
      
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
      <div className="w-[380px] border-r flex items-center justify-center bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900 shadow-[1px_0px_0px_0px_rgba(0,0,0,0.08)] dark:shadow-[1px_0px_0px_0px_rgba(255,255,255,0.05)] h-screen overflow-hidden">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-[10px]">
            <h2 className="text-[20px] font-semibold text-gray-900 dark:text-gray-100">Messages</h2>
            <div className="px-2 py-0.5 bg-[#EDF2F7] dark:bg-gray-800 rounded-[24px]">
              <span className="text-[12px] font-semibold text-gray-900 dark:text-gray-100">{conversations.length}</span>
            </div>
          </div>
        </div>
        <div className="h-px bg-black dark:bg-white opacity-[0.08] dark:opacity-[0.1]" />
        
        {/* Search */}
        <div className="px-6 py-3">
          <div className="flex items-center gap-[10px] px-5 py-2.5 bg-[#F3F3F3] dark:bg-gray-800 rounded-xl">
            <Search className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 opacity-40" />
            <input
              type="text"
              placeholder="Search messages"
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-600 dark:text-gray-300 opacity-40 dark:opacity-60 placeholder:text-gray-600 dark:placeholder:text-gray-400"
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
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const name = getConversationName(conv, user?._id);
              const lastMessage = getLastMessagePreview(conv);
              const timeAgo = getTimeAgo(conv.updated_at || conv.created_at);
              
              // Check if the last message is unread by current user
              // Only mark as unread if: 1) message exists, 2) sender is NOT current user, 3) current user hasn't read it
              const lastMessageSenderId = typeof conv.last_message?.sender_id === 'string' 
                ? conv.last_message.sender_id 
                : conv.last_message?.sender_id?._id;
              
              const isUnread = conv.last_message && 
                              lastMessageSenderId !== user?._id && 
                              !conv.last_message.read_by?.some(
                                r => (typeof r.user_id === 'string' ? r.user_id : r.user_id?._id) === user?._id
                              );
              
              return (
                <div
                  key={conv._id}
                  onClick={() => onSelect(conv._id)}
                  className={cn(
                    'flex gap-4 p-3 cursor-pointer rounded-xl transition-all',
                    selectedId === conv._id 
                      ? 'bg-[#615EF0]/6 dark:bg-[#615EF0]/20' 
                      : 'hover:bg-[#615EF0]/6 dark:hover:bg-[#615EF0]/10'
                  )}
                >
                  <Avatar className="h-12 w-12 flex-shrink-0 rounded-xl">
                    <AvatarImage 
                      src={
                        conv.type === 'direct'
                          ? getFileUrl(conv.participants?.find(p => p.user_id?._id !== user?._id)?.user_id?.avatar_url)
                          : conv.avatar_url ? getFileUrl(conv.avatar_url) : undefined
                      } 
                    />
                    <AvatarFallback className="rounded-xl bg-gray-200 dark:bg-gray-700">
                      {name[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className={cn(
                        "text-[14px] leading-[21px] truncate text-gray-900 dark:text-gray-100",
                        isUnread ? "font-bold" : "font-semibold"
                      )}>
                        {name}
                      </span>
                      <span className={cn(
                        "text-[14px] text-gray-900 dark:text-gray-400 flex-shrink-0",
                        isUnread ? "font-bold opacity-60" : "font-semibold opacity-30"
                      )}>
                        {timeAgo}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <p className={cn(
                        "text-[14px] leading-[21px] text-gray-900 dark:text-gray-300 truncate flex-1",
                        isUnread ? "font-semibold opacity-80" : "opacity-40"
                      )}>
                        {lastMessage}
                      </p>
                      {isUnread && (
                        <div className="w-2 h-2 bg-[#615EF0] rounded-full flex-shrink-0" />
                      )}
                    </div>

                    {/* Badges */}
                    {conv.type === 'group' && (
                      <div className="flex gap-2">
                        <span className="px-2 py-0.5 bg-[#FEEBC8] dark:bg-amber-500/20 text-[#DD6B20] dark:text-amber-400 text-[12px] font-semibold rounded-xl">
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
