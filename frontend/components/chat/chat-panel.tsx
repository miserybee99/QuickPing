'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, Paperclip, Check, Smile, MessageCircle, Vote, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import vi from 'date-fns/locale/vi';
import api from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import { toast } from '@/components/ui/use-toast';
import { Conversation, Message, User, Vote as VoteType } from '@/types';
import { cn, formatLastSeen } from '@/lib/utils';
import { getFileUrl } from '@/lib/file-utils';
import { useUser } from '@/hooks/useUser';
import { useSocket } from '@/contexts/SocketContext';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { SeenStatus } from '@/components/chat/seen-status';
import { StatusDot } from '@/components/ui/status-indicator';
import { MessageActions } from '@/components/chat/message-actions';
import { MessageEditInput } from '@/components/chat/message-edit-input';
import { EmojiPicker } from '@/components/emoji/emoji-picker';
import { FilePreview, SelectedFile, validateFile, createSelectedFile, MAX_FILES } from '@/components/chat/file-preview';
import { FileMessage } from '@/components/chat/file-message';
import { FilePreviewModal } from '@/components/modals/file-preview-modal';
import { MessageReactions } from '@/components/chat/message-reactions';
import { ReplyPreview } from '@/components/chat/reply-preview';
import { QuotedMessage } from '@/components/chat/quoted-message';
import { ThreadPanel } from '@/components/chat/thread-panel';
import { PinnedMessages } from '@/components/chat/pinned-messages';
import { VoteMessage } from '@/components/chat/vote-message';
import { CreateVoteModal } from '@/components/modals/create-vote-modal';
import { AISummaryModal } from '@/components/modals/ai-summary-modal';
import { Sparkles } from 'lucide-react';

// Component to linkify URLs in text
function LinkifiedText({ text, className }: { text: string; className?: string }) {
  // URL regex pattern
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  
  const parts = text.split(urlPattern);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlPattern)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:opacity-80 break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

interface ChatPanelProps {
  conversationId: string | null;
  onConversationLoaded?: (conversation: Conversation | null) => void;
}

export function ChatPanel({ conversationId, onConversationLoaded }: ChatPanelProps) {
  const { user: currentUser } = useUser();
  const { socket, isConnected } = useSocket();
  const { isUserOnline } = useUserStatus();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  
  // New state for Phase 1 features
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // File upload state (Phase 2)
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    url: string;
    type: string;
    size: number;
  } | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // Phase 3: Message Interactions state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [activeThread, setActiveThread] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [threadReplyCounts, setThreadReplyCounts] = useState<Map<string, number>>(new Map());
  
  // Phase 4: Vote state
  const [votes, setVotes] = useState<Map<string, VoteType>>(new Map());
  const [showCreateVoteModal, setShowCreateVoteModal] = useState(false);
  const [isVotesCollapsed, setIsVotesCollapsed] = useState(true);
  
  // Phase 6: AI Summary state
  const [showAISummaryModal, setShowAISummaryModal] = useState(false);
  
  // Friendship state
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [friendshipLoading, setFriendshipLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const markAsReadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Create a users map for reactions display
  const usersMap = useMemo(() => {
    const map = new Map<string, { _id: string; username: string; avatar_url?: string }>();
    
    // Add current user
    if (currentUser) {
      map.set(currentUser._id, {
        _id: currentUser._id,
        username: currentUser.username,
        avatar_url: currentUser.avatar_url,
      });
    }
    
    // Add participants from conversation
    if (conversation?.participants) {
      conversation.participants.forEach((p) => {
        if (p.user_id?._id) {
          map.set(p.user_id._id, {
            _id: p.user_id._id,
            username: p.user_id.username,
            avatar_url: p.user_id.avatar_url,
          });
        }
      });
    }
    
    // Add senders from messages
    messages.forEach((msg) => {
      if (msg.sender_id?._id) {
        map.set(msg.sender_id._id, {
          _id: msg.sender_id._id,
          username: msg.sender_id.username,
          avatar_url: msg.sender_id.avatar_url,
        });
      }
    });
    
    return map;
  }, [currentUser, conversation, messages]);

  useEffect(() => {
    if (conversationId) {
      fetchConversation();
      fetchMessages();
      fetchVotes(); // Fetch votes for group chats
      // Reset phase 3 states when conversation changes
      setReplyingTo(null);
      setActiveThread(null);
      setPinnedMessages([]);
      setVotes(new Map()); // Reset votes
    } else {
      setConversation(null);
      setMessages([]);
      setReplyingTo(null);
      setActiveThread(null);
      setPinnedMessages([]);
      setVotes(new Map());
    }
  }, [conversationId]);
  
  // Fetch pinned messages when conversation loads OR when messages load
  useEffect(() => {
    if (conversation?.pinned_messages && conversation.pinned_messages.length > 0 && messages.length > 0) {
      // Pinned messages should already be populated from conversation fetch
      // We need to fetch full message objects for the pinned IDs
      fetchPinnedMessages();
    } else if (!conversation?.pinned_messages || conversation.pinned_messages.length === 0) {
      setPinnedMessages([]);
    }
  }, [conversation?.pinned_messages, messages.length]);

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
        // Filter out thread messages - they should only appear in thread panel, not main chat
        if (data.message.thread_id) {
          console.log('⚠️ Thread message ignored in main chat:', data.message._id, 'thread_id:', data.message.thread_id);
          // Update thread reply count but don't add to main messages
          if (data.message.thread_id) {
            setThreadReplyCounts(prev => {
              const newMap = new Map(prev);
              const currentCount = newMap.get(data.message.thread_id?.toString() || '') || 0;
              newMap.set(data.message.thread_id.toString(), currentCount + 1);
              return newMap;
            });
          }
          return;
        }
        
        const messageId = data.message._id?.toString();
        
        // Use ref to track message IDs to prevent duplicates across re-renders
        if (messageIdsRef.current.has(messageId)) {
          console.log('⚠️ Duplicate message ignored (ref check):', messageId);
          return;
        }
        
        messageIdsRef.current.add(messageId);
        
        // Check if input field is focused BEFORE adding message to state
        // Only mark messages from other users, not own messages
        const senderId = data.message.sender_id?._id?.toString() || data.message.sender_id?.toString();
        const currentUserId = currentUser?._id?.toString();
        const isFromOtherUser = senderId && currentUserId && senderId !== currentUserId;
        
        // Check if input is focused (either directly or if it's in the active element's form)
        const isInputFocused = inputRef.current && (
          document.activeElement === inputRef.current ||
          (document.activeElement instanceof HTMLElement && 
           document.activeElement.closest('form')?.contains(inputRef.current))
        );
        
        // If input is focused and message is from other user, mark it as read immediately
        const shouldMarkAsRead = isFromOtherUser && isInputFocused;
        
        // Add message to state with read_by already set if needed
        setMessages((prev) => {
          // Double check in state
          const exists = prev.some(m => m._id?.toString() === messageId);
          
          if (exists) {
            console.log('⚠️ Duplicate message ignored (state check):', messageId);
            return prev;
          }
          
          console.log('✅ Adding new message to state:', messageId);
          
          // Create message object with read_by if input is focused
          const messageToAdd = shouldMarkAsRead && currentUserId ? {
            ...data.message,
            read_by: [
              ...(data.message.read_by || []),
              { user_id: currentUserId, read_at: new Date() }
            ]
          } : data.message;
          
          // Sort messages by created_at to ensure correct order
          const newMessages = [...prev, messageToAdd].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateA - dateB;
          });
          
          return newMessages;
        });
        
        // Mark as read with API call if input is focused
        if (shouldMarkAsRead) {
          console.log('👁️ Input is focused, marking new message as read:', messageId);
          
          // Mark as read with API call (with a small delay to ensure message is in state)
          setTimeout(() => {
            if (markAsReadTimeoutRef.current) {
              clearTimeout(markAsReadTimeoutRef.current);
            }
            markAsReadTimeoutRef.current = setTimeout(() => {
              // Mark just this new message as read via API
              apiClient.messages.markAsRead(messageId).then((response: any) => {
                console.log('📥 API Response full:', response);
                const updatedMessage = response?.data?.message || response?.message;
                console.log('✅ New message marked as read (input focused):', messageId, 'Updated message:', updatedMessage);
                
                // Update state with response from server (to ensure consistency)
                if (updatedMessage && updatedMessage.read_by) {
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (msg._id?.toString() === messageId) {
                        return {
                          ...msg,
                          read_by: updatedMessage.read_by
                        };
                      }
                      return msg;
                    });
                  });
                } else {
                  // If response doesn't have read_by, just ensure current user is in read_by
                  setMessages((prev) => {
                    return prev.map((msg) => {
                      if (msg._id?.toString() === messageId) {
                        const alreadyRead = msg.read_by?.some(
                          (r) => {
                            const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                            return readUserId === currentUserId;
                          }
                        );
                        
                        if (!alreadyRead && currentUserId) {
                          return {
                            ...msg,
                            read_by: [
                              ...(msg.read_by || []),
                              { user_id: currentUserId, read_at: new Date() }
                            ]
                          };
                        }
                      }
                      return msg;
                    });
                  });
                }
                
                // Emit socket event for read receipt
                if (socket && conversationId && currentUserId) {
                  socket.emit('messages_read', {
                    conversation_id: conversationId,
                    message_ids: [messageId],
                    user_id: currentUserId
                  });
                }
              }).catch((err: any) => {
                console.error('Error marking new message as read:', err);
                // Remove read_by if API call fails
                setMessages((prev) => {
                  return prev.map((msg) => {
                    if (msg._id?.toString() === messageId) {
                      return {
                        ...msg,
                        read_by: (msg.read_by || []).filter(
                          (r) => {
                            const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                            return readUserId !== currentUserId;
                          }
                        )
                      };
                    }
                    return msg;
                  });
                });
              });
            }, 200); // Small delay to ensure message is processed
          }, 100);
        }
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
        setTypingUsers(() => {
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
    };
    
    // Listen for bulk read receipts
    const handleMessagesReadReceipt = (data: { 
      user_id: string; 
      conversation_id: string; 
      message_ids: string[];
      read_at: Date;
    }) => {
      console.log('📖 Messages read receipt received:', data);
      
      if (data.conversation_id === conversationId) {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (data.message_ids.includes(msg._id)) {
              // Check if already in read_by
              const alreadyRead = msg.read_by?.some(
                (r) => {
                  const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                  return readUserId === data.user_id;
                }
              );
              
              if (!alreadyRead) {
                return {
                  ...msg,
                  read_by: [
                    ...(msg.read_by || []),
                    { user_id: data.user_id, read_at: new Date(data.read_at) }
                  ]
                };
              }
            }
            return msg;
          });
        });
      }
    };
    
    // Listen for single read receipt
    const handleReadReceipt = (data: { user_id: string; message_id: string; read_at: Date }) => {
      console.log('📖 Single read receipt received:', data);
      
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg._id === data.message_id) {
            // Check if already in read_by
            const alreadyRead = msg.read_by?.some(
              (r) => {
                const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
                return readUserId === data.user_id;
              }
            );
            
            if (!alreadyRead) {
              return {
                ...msg,
                read_by: [
                  ...(msg.read_by || []),
                  { user_id: data.user_id, read_at: new Date(data.read_at) }
                ]
              };
            }
          }
          return msg;
        });
      });
    };
    
    // Listen for message edited
    const handleMessageEdited = (data: { message_id: string; conversation_id: string; content: string; is_edited: boolean }) => {
      console.log('✏️ Message edited received:', data);
      
      if (data.conversation_id === conversationId) {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg._id === data.message_id) {
              return {
                ...msg,
                content: data.content,
                is_edited: data.is_edited
              };
            }
            return msg;
          });
        });
      }
    };
    
    // Listen for reaction updates
    const handleReactionUpdated = (data: { 
      message_id: string; 
      conversation_id: string; 
      reactions: Array<{ emoji: string; user_id: string }>;
    }) => {
      console.log('😀 Reaction updated:', data);
      
      if (data.conversation_id === conversationId) {
        setMessages((prev) => {
          return prev.map((msg) => {
            if (msg._id === data.message_id) {
              return {
                ...msg,
                reactions: data.reactions
              };
            }
            return msg;
          });
        });
      }
    };
    
    // Listen for pin updates
    const handlePinUpdated = (data: { 
      message_id: string; 
      conversation_id: string; 
      action: 'pin' | 'unpin';
    }) => {
      console.log('📌 Pin updated:', data);
      
      if (data.conversation_id === conversationId) {
        if (data.action === 'pin') {
          // Find the message and add it to pinned using functional setState
          setMessages(currentMessages => {
            const pinnedMessage = currentMessages.find(m => m._id === data.message_id);
            if (pinnedMessage) {
              setPinnedMessages(prevPinned => {
                if (!prevPinned.some(p => p._id === data.message_id)) {
                  return [...prevPinned, pinnedMessage];
                }
                return prevPinned;
              });
            }
            return currentMessages;
          });
        } else {
          // Remove from pinned
          setPinnedMessages(prev => prev.filter(p => p._id !== data.message_id));
        }
      }
    };
    
    // Listen for thread updates
    const handleThreadUpdated = (data: { 
      thread_id: string; 
      conversation_id: string; 
      reply_count: number;
    }) => {
      console.log('💬 Thread updated:', data);
      
      if (data.conversation_id === conversationId) {
        setThreadReplyCounts(prev => {
          const newMap = new Map(prev);
          newMap.set(data.thread_id, data.reply_count);
          return newMap;
        });
      }
    };
    
    // Listen for vote updates
    const handleVoteUpdated = (data: {
      vote_id: string;
      conversation_id: string;
      vote: VoteType;
    }) => {
      console.log('🗳️ Vote updated:', data);
      
      if (data.conversation_id === conversationId) {
        setVotes(prev => {
          const newMap = new Map(prev);
          newMap.set(data.vote_id, data.vote);
          return newMap;
        });
      }
    };
    
    // Listen for new votes
    const handleNewVote = (data: {
      conversation_id: string;
      vote: VoteType;
    }) => {
      console.log('🗳️ New vote received:', data);
      
      if (data.conversation_id === conversationId && data.vote?._id) {
        setVotes(prev => {
          const newMap = new Map(prev);
          newMap.set(data.vote._id, data.vote);
          return newMap;
        });
      }
    };

    // Listen for conversation updates (participant removal, role changes, etc.)
    const handleConversationUpdated = (data: any) => {
      console.log('📡 Conversation updated in chat panel:', data);
      
      if (data.conversation && data.conversation._id?.toString() === conversationId) {
        const currentUserId = currentUser?._id?.toString();
        
        // Handle participant addition
        if (data.type === 'participant_added') {
          const addedUserIds = data.added_user_ids || [];
          const currentUserId = currentUser?._id?.toString();
          
          // If current user was added to this conversation, join the conversation room
          if (currentUserId && addedUserIds.includes(currentUserId)) {
            console.log('👤 Current user was added to conversation, joining room');
            socket.emit('join_conversation', conversationId);
          }
          
          // Update conversation with new participants
          console.log('👤 Participant(s) added, updating conversation');
          setConversation(data.conversation);
          onConversationLoaded?.(data.conversation);
        }
        
        // Handle participant removal
        if (data.type === 'participant_removed') {
          // If current user was removed, redirect to groups page
          if (data.removed_user_id === currentUserId) {
            console.log('⚠️ Current user was removed from group, redirecting...');
            window.location.href = '/groups';
            return;
          }
          
          // Update conversation with new participants
          console.log('👤 Participant removed, updating conversation');
          setConversation(data.conversation);
          onConversationLoaded?.(data.conversation);
        }
        
        // Handle role changes
        if (data.type === 'role_change') {
          console.log('👤 Role changed, updating conversation');
          setConversation(data.conversation);
          onConversationLoaded?.(data.conversation);
        }
      }
    };

    socket.on('joined_conversation', handleJoinedConversation);
    socket.on('message_received', handleMessageReceived);
    socket.on('user_typing', handleUserTyping);
    socket.on('user_stopped_typing', handleUserStoppedTyping);
    socket.on('user_status_changed', handleUserStatusChanged);
    socket.on('messages_read_receipt', handleMessagesReadReceipt);
    socket.on('read_receipt', handleReadReceipt);
    socket.on('message_edited', handleMessageEdited);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('pin_updated', handlePinUpdated);
    socket.on('thread_updated', handleThreadUpdated);
    socket.on('vote_updated', handleVoteUpdated);
    socket.on('new_vote', handleNewVote);
    socket.on('conversation_updated', handleConversationUpdated);
    
    // Listen for vote deletion
    const handleVoteDeleted = (data: { vote_id: string; conversation_id: string }) => {
      console.log('🗳️ Vote deleted:', data);
      if (data.conversation_id === conversationId) {
        setVotes(prev => {
          const newMap = new Map(prev);
          newMap.delete(data.vote_id);
          return newMap;
        });
      }
    };
    socket.on('vote_deleted', handleVoteDeleted);
    
    // Listen for friendship status changes
    const handleFriendshipStatusChanged = (data: { user_id: string; friend_id: string; status: string }) => {
      console.log('👫 Friendship status changed:', data);
      // Update friendship status if this conversation involves the changed friendship
      if (conversation?.type === 'direct') {
        const otherUser = conversation.participants.find(p => p.user_id?._id !== currentUser?._id);
        if (otherUser?.user_id?._id === data.user_id || otherUser?.user_id?._id === data.friend_id) {
          setFriendshipStatus(data.status as 'none' | 'pending' | 'accepted' | 'rejected');
        }
      }
    };
    socket.on('friendship_status_changed', handleFriendshipStatusChanged);

    // Cleanup
    return () => {
      console.log('🔌 Cleaning up socket listeners for conversation:', conversationId);
      socket.off('joined_conversation', handleJoinedConversation);
      socket.off('message_received', handleMessageReceived);
      socket.off('user_typing', handleUserTyping);
      socket.off('user_stopped_typing', handleUserStoppedTyping);
      socket.off('user_status_changed', handleUserStatusChanged);
      socket.off('messages_read_receipt', handleMessagesReadReceipt);
      socket.off('read_receipt', handleReadReceipt);
      socket.off('message_edited', handleMessageEdited);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('pin_updated', handlePinUpdated);
      socket.off('thread_updated', handleThreadUpdated);
      socket.off('vote_updated', handleVoteUpdated);
      socket.off('new_vote', handleNewVote);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('vote_deleted', handleVoteDeleted);
      socket.off('friendship_status_changed', handleFriendshipStatusChanged);
      
      // IMPORTANT: DO NOT leave conversation room here!
      // The messages-panel component needs to stay in ALL conversation rooms
      // to receive real-time updates for all conversations, even when not viewing them.
      // Leaving the room here causes messages to stop appearing in real-time in the messages panel.
      // socket.emit('leave_conversation', conversationId); // REMOVED
      
      // Clear typing indicators
      setTypingUsers(new Set());
      setIsTyping(false);
      
      // Clear mark as read timeout
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
        markAsReadTimeoutRef.current = null;
      }
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
      const conv = response.data.conversation;
      setConversation(conv);
      onConversationLoaded?.(conv);
      
      // Fetch friendship status for direct conversations
      if (conv.type === 'direct' && currentUser) {
        const otherUser = conv.participants.find(p => p.user_id?._id !== currentUser._id);
        if (otherUser?.user_id?._id) {
          fetchFriendshipStatus(otherUser.user_id._id);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation:', error);
      setConversation(null);
      onConversationLoaded?.(null);
    }
  };
  
  // Fetch friendship status
  const fetchFriendshipStatus = async (userId: string) => {
    try {
      const response = await apiClient.friends.checkStatus(userId);
      setFriendshipStatus(response.data.status || 'none');
    } catch (error) {
      console.error('Error checking friendship status:', error);
      setFriendshipStatus('none');
    }
  };

  const fetchMessages = async () => {
    if (!conversationId) return;

    try {
      setLoading(true);
      const response = await api.get<{ messages: Message[] }>(`/messages/conversation/${conversationId}`);
      const fetchedMessages = response.data.messages || [];
      
      // Calculate thread reply counts from ALL messages (including thread messages) BEFORE filtering
      // This ensures accurate thread counts even though thread messages are excluded from main chat
      const threadCounts = new Map<string, number>();
      fetchedMessages.forEach(msg => {
        if (msg.thread_id) {
          const threadId = msg.thread_id?.toString() || (msg.thread_id as any)?._id?.toString();
          if (threadId) {
            const count = threadCounts.get(threadId) || 0;
            threadCounts.set(threadId, count + 1);
          }
        }
      });
      setThreadReplyCounts(threadCounts);
      
      // Filter out thread messages - they should only appear in thread panel, not main chat
      // Also remove duplicates by ID before setting state
      const uniqueMessages = fetchedMessages.filter((msg, index, self) => {
        // Exclude thread messages
        if (msg.thread_id) {
          return false;
        }
        
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
  
  // Fetch pinned messages
  const fetchPinnedMessages = async () => {
    if (!conversationId || !conversation?.pinned_messages) return;
    
    try {
      // Pinned messages are message IDs - find them in current messages or fetch separately
      const pinnedIds = conversation.pinned_messages.map(p => 
        typeof p === 'string' ? p : (p as any)?._id?.toString()
      ).filter(Boolean);
      
      // First try to find them in current messages
      const foundPinned = messages.filter(m => pinnedIds.includes(m._id));
      
      if (foundPinned.length === pinnedIds.length) {
        setPinnedMessages(foundPinned);
      } else {
        // Some pinned messages might be older and not loaded, just use what we have
        setPinnedMessages(foundPinned);
      }
    } catch (error) {
      console.error('Error fetching pinned messages:', error);
    }
  };
  
  // Fetch votes for conversation
  const fetchVotes = async () => {
    if (!conversationId) return;
    
    try {
      const response = await apiClient.votes.getByConversation(conversationId);
      const fetchedVotes = (response as any).data?.votes || (response as any).votes || [];
      
      // Store votes in map
      const votesMap = new Map<string, VoteType>();
      fetchedVotes.forEach((vote: VoteType) => {
        if (vote._id) {
          votesMap.set(vote._id, vote);
        }
      });
      setVotes(votesMap);
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };
  
  // Handle reaction add/remove
  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await apiClient.messages.addReaction(messageId, emoji);
      const updatedMessage = (response as any).data?.message || (response as any).message;
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg
      ));
      
      // Emit socket event
      if (socket && conversationId) {
        socket.emit('reaction_added', {
          message_id: messageId,
          conversation_id: conversationId,
          emoji,
          reactions: updatedMessage.reactions
        });
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };
  
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await apiClient.messages.removeReaction(messageId, emoji);
      const updatedMessage = (response as any).data?.message || (response as any).message;
      
      // Update local state
      setMessages(prev => prev.map(msg => 
        msg._id === messageId ? { ...msg, reactions: updatedMessage.reactions } : msg
      ));
      
      // Emit socket event
      if (socket && conversationId) {
        socket.emit('reaction_removed', {
          message_id: messageId,
          conversation_id: conversationId,
          emoji,
          reactions: updatedMessage.reactions
        });
      }
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };
  
  // Handle pin/unpin
  const handlePinMessage = async (messageId: string) => {
    if (!conversationId) return;
    
    try {
      await apiClient.conversations.pinMessage(conversationId, messageId);
      
      // Add to local state
      const pinnedMessage = messages.find(m => m._id === messageId);
      if (pinnedMessage) {
        setPinnedMessages(prev => [...prev, pinnedMessage]);
      }
      
      // Emit socket event
      if (socket) {
        socket.emit('message_pinned', {
          message_id: messageId,
          conversation_id: conversationId
        });
      }
    } catch (error) {
      console.error('Error pinning message:', error);
    }
  };
  
  const handleUnpinMessage = async (messageId: string) => {
    if (!conversationId) return;
    
    try {
      await apiClient.conversations.unpinMessage(conversationId, messageId);
      
      // Remove from local state
      setPinnedMessages(prev => prev.filter(p => p._id !== messageId));
      
      // Emit socket event
      if (socket) {
        socket.emit('message_unpinned', {
          message_id: messageId,
          conversation_id: conversationId
        });
      }
    } catch (error) {
      console.error('Error unpinning message:', error);
    }
  };
  
  // Handle reply
  const handleReply = (message: Message) => {
    // Exclusive state: close thread if open
    if (activeThread) {
      setActiveThread(null);
    }
    setReplyingTo(message);
    inputRef.current?.focus();
  };
  
  const handleCancelReply = () => {
    setReplyingTo(null);
  };
  
  // Handle thread
  const handleOpenThread = (message: Message) => {
    // Exclusive state: close reply if active
    if (replyingTo) {
      setReplyingTo(null);
    }
    setActiveThread(message);
  };
  
  const handleCloseThread = () => {
    setActiveThread(null);
  };
  
  // Handle thread reply
  const handleSendThreadReply = async (content: string, threadId: string): Promise<void> => {
    if (!conversationId) return;
    
    try {
      const response = await apiClient.messages.send({
        conversation_id: conversationId,
        content,
        type: 'text',
        thread_id: threadId
      });
      
      const newMessage = (response as any).data?.message || (response as any).message;
      
      // Update thread count
      setThreadReplyCounts(prev => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(threadId) || 0;
        newMap.set(threadId, currentCount + 1);
        return newMap;
      });
      
      // Emit socket event
      if (socket) {
        socket.emit('thread_reply_sent', {
          thread_id: threadId,
          conversation_id: conversationId,
          reply_count: (threadReplyCounts.get(threadId) || 0) + 1,
          message: newMessage
        });
      }
    } catch (error) {
      console.error('Error sending thread reply:', error);
      throw error;
    }
  };
  
  // Scroll to message by ID
  const scrollToMessage = useCallback((messageId: string) => {
    const messageElement = messageRefs.current.get(messageId);
    if (messageElement) {
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add highlight effect
      messageElement.classList.add('bg-yellow-100');
      setTimeout(() => {
        messageElement.classList.remove('bg-yellow-100');
      }, 2000);
    } else {
      // Message not in view - could implement loading older messages here
      console.log('Message not loaded, would need to fetch older messages');
    }
  }, []);
  
  // Check if user can pin (admin/moderator)
  const canPinMessages = useMemo(() => {
    if (!currentUser || !conversation) return false;
    
    // Direct chats: both users can pin
    if (conversation.type === 'direct') return true;
    
    // Group chats: only admin/moderator can pin
    const participant = conversation.participants?.find(
      p => p.user_id?._id?.toString() === currentUser._id?.toString()
    );
    
    return participant?.role === 'admin' || participant?.role === 'moderator';
  }, [currentUser, conversation]);
  
  // Check if conversation is a group (for vote feature)
  const isGroupChat = useMemo(() => {
    return conversation?.type === 'group';
  }, [conversation]);

  // Get current user's role in the group
  const currentUserRole = useMemo((): 'admin' | 'moderator' | 'member' => {
    if (!currentUser || !conversation || conversation.type !== 'group') {
      return 'member';
    }
    const participant = conversation.participants?.find(
      p => p.user_id?._id?.toString() === currentUser._id?.toString()
    );
    return participant?.role || 'member';
  }, [currentUser, conversation]);
  
  // Handle vote creation
  const handleCreateVote = async (voteData: {
    question: string;
    options: string[];
    settings: { allow_multiple: boolean; anonymous: boolean };
    expires_at?: string;
  }) => {
    if (!conversationId) return;
    
    try {
      const response = await apiClient.votes.create({
        conversation_id: conversationId,
        question: voteData.question,
        options: voteData.options,
        settings: voteData.settings,
        expires_at: voteData.expires_at
      });
      
      const newVote = (response as any).data?.vote || (response as any).vote;
      
      // Add vote to local state
      if (newVote?._id) {
        setVotes(prev => {
          const newMap = new Map(prev);
          newMap.set(newVote._id, newVote);
          return newMap;
        });
      }
      
      // Emit socket event for realtime update
      if (socket) {
        socket.emit('vote_created', {
          conversation_id: conversationId,
          vote: newVote
        });
      }
      
      setShowCreateVoteModal(false);
    } catch (error) {
      console.error('Error creating vote:', error);
      throw error;
    }
  };
  
  // Handle casting a vote
  const handleCastVote = async (voteId: string, optionIndex: number) => {
    try {
      const response = await apiClient.votes.vote(voteId, optionIndex);
      const updatedVote = (response as any).data?.vote || (response as any).vote;
      
      // Update local state
      if (updatedVote?._id) {
        setVotes(prev => {
          const newMap = new Map(prev);
          newMap.set(updatedVote._id, updatedVote);
          return newMap;
        });
      }
      
      // Emit socket event
      if (socket && conversationId) {
        socket.emit('vote_cast', {
          conversation_id: conversationId,
          vote_id: voteId,
          vote: updatedVote
        });
      }
    } catch (error) {
      console.error('Error casting vote:', error);
      throw error;
    }
  };

  // Handle deleting a vote
  const handleDeleteVote = async (voteId: string) => {
    try {
      await apiClient.votes.delete(voteId);
      
      // Remove from local state (socket event will also update this)
      setVotes(prev => {
        const newMap = new Map(prev);
        newMap.delete(voteId);
        return newMap;
      });
    } catch (error) {
      console.error('Error deleting vote:', error);
      throw error;
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !conversationId || sending) return;

    const messageContent = message.trim();
    const replyToId = replyingTo?._id;
    
    setSending(true);
    setMessage(''); // Clear input immediately for better UX
    setReplyingTo(null); // Clear reply state
    
    // Stop typing indicator
    if (socket && conversationId) {
      socket.emit('stop_typing', { conversation_id: conversationId });
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
    
    try {
      console.log('📤 Sending message:', { conversationId, content: messageContent, replyTo: replyToId });
      const response = await api.post<{ message: Message }>('/messages', {
        conversation_id: conversationId,
        content: messageContent,
        type: 'text',
        reply_to: replyToId,
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

  // Handle edit message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await apiClient.messages.edit(messageId, newContent);
      
      // Update message in state
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, content: newContent, is_edited: true }
            : msg
        )
      );
      
      // Emit socket event for realtime update
      if (socket && conversationId) {
        socket.emit('message_edited', {
          message_id: messageId,
          conversation_id: conversationId,
          content: newContent,
          is_edited: true,
        });
      }
      
      setEditingMessageId(null);
    } catch (error) {
      console.error('Failed to edit message:', error);
      throw error;
    }
  };

  // Handle emoji select for message input
  const handleEmojiSelect = (emoji: string) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || message.length;
      const end = input.selectionEnd || message.length;
      const newValue = message.slice(0, start) + emoji + message.slice(end);
      setMessage(newValue);
      
      // Move cursor after emoji
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      setMessage(message + emoji);
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      newFiles.push(createSelectedFile(file));
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle file removal
  const handleRemoveFile = (fileId: string) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev.find((f) => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((f) => f.id !== fileId);
    });
  };

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const newFiles: SelectedFile[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const validation = validateFile(file);
      
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
        continue;
      }

      if (selectedFiles.length + newFiles.length >= MAX_FILES) {
        errors.push(`Maximum ${MAX_FILES} files allowed`);
        break;
      }

      newFiles.push(createSelectedFile(file));
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  // Handle sending message with files
  const handleSendWithFiles = async () => {
    if (selectedFiles.length === 0 && !message.trim()) return;
    if (!conversationId || sending) return;

    const messageContent = message.trim();
    setSending(true);
    setMessage('');

    // Stop typing indicator
    if (socket && conversationId) {
      socket.emit('stop_typing', { conversation_id: conversationId });
      setIsTyping(false);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }

    try {
      // Upload and send files one by one
      if (selectedFiles.length > 0) {
        const filesToUpload = selectedFiles.map((f) => f.file);
        
        for (let i = 0; i < filesToUpload.length; i++) {
          const file = filesToUpload[i];
          const fileId = selectedFiles[i].id;
          
          try {
            // Update file status to uploading
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, status: 'uploading', progress: 0 } : f
              )
            );

            // Upload file
            const uploadResult = await apiClient.files.upload(file, conversationId, (progress: number) => {
              setSelectedFiles((prev) =>
                prev.map((f) =>
                  f.id === fileId ? { ...f, progress } : f
                )
              );
            });

            const uploadedFile = (uploadResult as any).data?.file || (uploadResult as any).file;
            
            // Debug: Log uploaded file info
            console.log('Uploaded file:', {
              filename: uploadedFile.original_name,
              mime_type: uploadedFile.mime_type,
              url: uploadedFile.url,
              file_id: uploadedFile._id
            });
            
            // Determine message type based on mime_type
            let messageType: 'text' | 'file' | 'image' | 'video' | 'system' = 'file';
            if (uploadedFile.mime_type?.startsWith('image/')) {
              messageType = 'image';
              console.log('✅ Detected as IMAGE, setting type to:', messageType);
            } else if (uploadedFile.mime_type?.startsWith('video/')) {
              messageType = 'video';
              console.log('✅ Detected as VIDEO, setting type to:', messageType);
            }
            
            console.log('Final message type:', messageType);
            
            // Send message with file_info
            const fileContent = i === 0 ? messageContent : ''; // Only add text to first file message
            const response = await api.post<{ message: Message }>('/messages', {
              conversation_id: conversationId,
              content: fileContent || '',
              type: messageType,
              file_info: {
                file_id: uploadedFile._id,
                filename: uploadedFile.original_name,
                mime_type: uploadedFile.mime_type,
                size: uploadedFile.size,
                url: uploadedFile.url,
              },
            });

            const newMessage = response.data.message;
            const newMessageId = newMessage._id?.toString();
            
            if (newMessageId) {
              messageIdsRef.current.add(newMessageId);
            }

            // Add message to UI
            setMessages((prev) => {
              const exists = prev.some((m) => m._id?.toString() === newMessageId);
              if (exists) return prev;
              
              const newMessages = [...prev, newMessage].sort((a, b) => {
                const dateA = new Date(a.created_at || 0).getTime();
                const dateB = new Date(b.created_at || 0).getTime();
                return dateA - dateB;
              });
              
              return newMessages;
            });
            
            // Mark file as uploaded
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId ? { ...f, status: 'completed', progress: 100 } : f
              )
            );
          } catch (error: any) {
            console.error('File upload error:', error);
            setSelectedFiles((prev) =>
              prev.map((f) =>
                f.id === fileId 
                  ? { ...f, status: 'error', error: error.message || 'Upload failed' } 
                  : f
              )
            );
            // Continue with other files instead of throwing
          }
        }
      } else if (messageContent) {
        // Send text-only message
        const response = await api.post<{ message: Message }>('/messages', {
          conversation_id: conversationId,
          content: messageContent,
          type: 'text',
        });

        const newMessage = response.data.message;
        const newMessageId = newMessage._id?.toString();
        
        if (newMessageId) {
          messageIdsRef.current.add(newMessageId);
        }

        setMessages((prev) => {
          const exists = prev.some((m) => m._id?.toString() === newMessageId);
          if (exists) return prev;
          
          const newMessages = [...prev, newMessage].sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateA - dateB;
          });
          
          return newMessages;
        });
      }

      // Clear selected files after all uploads
      selectedFiles.forEach((f) => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
      setSelectedFiles([]);
    } catch (error: any) {
      console.error('Error sending message with files:', error);
      setMessage(messageContent);
      
      const errorMessage = error?.response?.data?.error || 
                          error?.message || 
                          'Failed to send message';
      alert(`❌ ${errorMessage}. Please try again.`);
    } finally {
      setSending(false);
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

  // Function to mark messages as read - can be called from multiple places
  const markMessagesAsRead = useCallback(async () => {
    if (!conversationId || !messages.length || !currentUser || !conversation) return;

    const currentUserId = currentUser._id?.toString();
    if (!currentUserId) return;

    const unreadMessages = messages.filter((msg) => {
      // Only mark messages from others, not own messages
      const senderId = msg.sender_id?._id?.toString() || msg.sender_id?.toString();
      if (senderId === currentUserId) return false;

      // Check if already read by current user
      const isRead = msg.read_by?.some(
        (r) => {
          const readUserId = typeof r.user_id === 'string' ? r.user_id : r.user_id?._id?.toString();
          return readUserId === currentUserId;
        }
      );
      return !isRead;
    });

    // Mark each unread message as read
    if (unreadMessages.length > 0) {
      console.log(`📖 Marking ${unreadMessages.length} messages as read`);
      
      const markPromises = unreadMessages.map((msg) =>
        apiClient.messages.markAsRead(msg._id).catch((err: any) => {
          console.error('Error marking message as read:', err);
        })
      );

      // Batch mark as read
      Promise.all(markPromises).then(() => {
        console.log('✅ Messages marked as read');
        // Emit socket event for read receipt
        if (socket && conversationId) {
          socket.emit('messages_read', {
            conversation_id: conversationId,
            message_ids: unreadMessages.map(m => m._id),
            user_id: currentUserId
          });
        }
      });
    }
  }, [conversationId, messages, currentUser, conversation, socket]);

  // Auto mark messages as read when viewing conversation (after load)
  useEffect(() => {
    if (!conversationId || !messages.length || !currentUser || !conversation) return;

    // Debounce mark as read to avoid too many API calls
    const timer = setTimeout(() => {
      markMessagesAsRead();
    }, 1000); // Wait 1 second after conversation/messages load

    return () => clearTimeout(timer);
  }, [conversationId, messages.length, currentUser, conversation, markMessagesAsRead]);

  // Auto-focus input when conversation changes and is loaded
  useEffect(() => {
    if (!conversationId || !conversation || loading) return;

    // Use requestAnimationFrame + setTimeout to ensure DOM is fully rendered
    const focusInput = () => {
      // Try multiple times with increasing delays to ensure input is ready
      const attempts = [100, 300, 500];
      
      attempts.forEach((delay, index) => {
        setTimeout(() => {
          if (inputRef.current) {
            // Check if input is in the DOM and not disabled
            if (inputRef.current.offsetParent !== null && !inputRef.current.disabled) {
              inputRef.current.focus();
              console.log(`✅ Auto-focused input for conversation: ${conversationId} (attempt ${index + 1})`);
            } else if (index === attempts.length - 1) {
              console.warn('⚠️ Could not auto-focus input - element not ready');
            }
          }
        }, delay);
      });
    };

    // Use requestAnimationFrame to wait for next paint
    requestAnimationFrame(() => {
      focusInput();
    });
  }, [conversationId, conversation, loading]);

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
    <div className="flex flex-col bg-white h-screen overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 flex flex-col z-10">
        {/* Connection status banner */}
        {!isConnected && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800 text-center">
            <span className="font-medium">⚠️ Reconnecting...</span> Messages may be delayed
          </div>
        )}
        
        <div className="h-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 flex-1">
            <Avatar className="h-10 w-10 rounded-[10px]">
              <AvatarImage src={
                conversation.type === 'direct' 
                  ? getFileUrl(otherParticipant?.avatar_url)
                  : conversation.avatar_url ? getFileUrl(conversation.avatar_url) : undefined
              } />
              <AvatarFallback className="rounded-[10px] bg-gray-200">
                {conversationName[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-[20px] leading-[25px]">{conversationName}</h3>
              {conversation.type === 'direct' && otherParticipant && (
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusDot 
                    isOnline={isUserOnline(otherParticipant._id) || otherParticipant.is_online || false} 
                    size="sm"
                    showOffline={true}
                  />
                  <span className="text-[12px] font-semibold text-gray-900 opacity-60">
                    {(isUserOnline(otherParticipant._id) || otherParticipant.is_online) 
                      ? 'Online' 
                      : formatLastSeen(otherParticipant.last_seen)
                    }
                  </span>
                </div>
              )}
            </div>
            {conversation.type === 'direct' && otherParticipant && (
              friendshipStatus === 'accepted' ? (
                <div className="h-10 px-4 bg-green-500/10 text-green-600 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 min-w-[130px]">
                  <Check className="w-4 h-4" />
                  Friend
                </div>
              ) : friendshipStatus === 'pending' ? (
                <div className="h-10 px-4 bg-amber-500/10 text-amber-600 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 min-w-[130px]">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-amber-600">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
                  </svg>
                  Pending
                </div>
              ) : (
                <button
                  onClick={async () => {
                    try {
                      setFriendshipLoading(true);
                      await apiClient.friends.sendRequest(otherParticipant._id);
                      setFriendshipStatus('pending');
                      toast({
                        title: "Success!",
                        description: "Friend request sent successfully.",
                        variant: "success"
                      });
                    } catch (error: any) {
                      const errorMsg = error?.response?.data?.error || 'Failed to send friend request';
                      toast({
                        title: "Error",
                        description: errorMsg,
                        variant: "destructive"
                      });
                    } finally {
                      setFriendshipLoading(false);
                    }
                  }}
                  disabled={friendshipLoading}
                  className="h-10 px-4 bg-[#615EF0] hover:bg-[#615EF0]/90 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 min-w-[130px] disabled:opacity-50"
                  title="Add Friend"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white">
                    <path d="M8 2V14M2 8H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Add Friend
                </button>
              )
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* AI Summarize Button */}
            <button 
              onClick={() => setShowAISummaryModal(true)}
              className="h-10 flex items-center gap-2 px-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-lg hover:from-purple-500/20 hover:to-pink-500/20 transition-all group min-w-[130px] justify-center"
              title="AI Summary"
            >
              <Sparkles className="w-5 h-5 text-purple-500 group-hover:text-purple-600" strokeWidth={1.5} />
              <span className="text-[14px] font-semibold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI Summary
              </span>
            </button>
          </div>
        </div>
        <div className="h-px bg-black opacity-[0.08]" />
      </div>
      
      {/* Pinned Messages Section */}
      {pinnedMessages.length > 0 && (
        <div className="flex-shrink-0">
          <PinnedMessages
            messages={pinnedMessages}
            onJumpToMessage={scrollToMessage}
            onUnpin={handleUnpinMessage}
            canUnpin={canPinMessages}
          />
        </div>
      )}
      
      {/* Active Votes Section - Group chats only */}
      {isGroupChat && votes.size > 0 && (
        <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => setIsVotesCollapsed(!isVotesCollapsed)}
            className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Vote className="w-4 h-4 text-[#615EF0]" />
              Active Votes ({Array.from(votes.values()).filter(v => v.is_active).length})
            </h4>
            {isVotesCollapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {!isVotesCollapsed && (
            <div className="px-6 pb-4 space-y-4 max-h-[300px] overflow-y-auto">
              {Array.from(votes.values())
                .filter(v => v.is_active)
                .map(vote => (
                  <VoteMessage
                    key={vote._id}
                    vote={vote}
                    currentUserId={currentUser?._id || ''}
                    currentUserRole={currentUserRole}
                    users={usersMap}
                    onVote={handleCastVote}
                    onDelete={handleDeleteVote}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div 
        ref={messagesContainerRef} 
        className={cn(
          "flex-1 px-6 py-6 bg-white relative",
          isDragOver && "ring-2 ring-[#615EF0] ring-inset"
        )}
        style={{ minHeight: 0, overflowY: 'auto' }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 bg-[#615EF0]/10 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-white rounded-xl shadow-lg px-8 py-6 text-center">
              <Paperclip className="w-12 h-12 text-[#615EF0] mx-auto mb-2" />
              <p className="text-lg font-medium text-gray-900">Drop files to upload</p>
              <p className="text-sm text-gray-500">Max {MAX_FILES} files, each &lt; 5MB</p>
            </div>
          </div>
        )}
        <div className="space-y-8">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              No messages yet. Start a conversation!
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
              const sameSenderBefore = prevMsg && prevMsg.sender_id?._id === msg.sender_id?._id;
              
              return (
                <div key={uniqueKey}>
                  {showDate && (
                    <div className="text-center text-xs text-gray-500 my-4">
                      {format(new Date(msg.created_at), 'dd/MM/yyyy', { locale: vi })}
                    </div>
                  )}
                  
                  <div 
                    className={cn('flex gap-4 group relative', isOwn ? 'flex-row-reverse' : 'flex-row', sameSenderBefore && 'mt-2.5')}
                    onMouseEnter={() => setHoveredMessageId(messageId)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    {/* Only show avatar for other person's messages */}
                    {!isOwn && !sameSenderBefore && (
                      <Avatar className="h-10 w-10 flex-shrink-0 rounded-[8.33px]">
                        <AvatarImage src={getFileUrl(msg.sender_id?.avatar_url)} />
                        <AvatarFallback className="rounded-[8.33px] bg-gray-200">
                          {msg.sender_id?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    {!isOwn && sameSenderBefore && <div className="w-10 flex-shrink-0" />}
                    
                    <div className={cn('flex flex-col gap-2.5', isOwn ? 'items-end' : 'items-start', 'relative')}>
                      {/* Edit mode */}
                      {editingMessageId === messageId ? (
                        <div className="w-full max-w-md">
                          <MessageEditInput
                            initialContent={msg.content || ''}
                            onSave={(newContent) => handleEditMessage(messageId, newContent)}
                            onCancel={() => setEditingMessageId(null)}
                          />
                        </div>
                      ) : (
                        <>
                          {/* Message bubble with actions */}
                          <div className="relative flex items-center gap-2">
                            {/* Actions menu - show on left for own messages, right for others */}
                            {isOwn && (
                              <MessageActions
                                isOwnMessage={true}
                                isVisible={hoveredMessageId === messageId}
                                isPinned={pinnedMessages.some(p => p._id === messageId)}
                                canPin={canPinMessages}
                                onEdit={() => setEditingMessageId(messageId)}
                                onReply={() => handleReply(msg)}
                                onReact={(emoji) => handleAddReaction(messageId, emoji)}
                                onPin={() => pinnedMessages.some(p => p._id === messageId) 
                                  ? handleUnpinMessage(messageId) 
                                  : handlePinMessage(messageId)
                                }
                                onThread={() => handleOpenThread(msg)}
                                onDelete={() => console.log('Delete:', messageId)}
                              />
                            )}
                            
                            {/* Render file outside bubble if it's an image/video */}
                            {msg.file_info && (msg.file_info.mime_type?.startsWith('image/') || msg.file_info.mime_type?.startsWith('video/')) ? (
                              <div
                                ref={(el) => {
                                  if (el) messageRefs.current.set(messageId, el);
                                }}
                                className="flex flex-col gap-2"
                              >
                                {/* Text content in bubble if present */}
                                {(msg.content || msg.reply_to) && (
                                  <div
                                    className={cn(
                                      'px-4 py-2 rounded-xl max-w-md transition-colors duration-500',
                                      isOwn
                                        ? 'bg-[#615EF0] text-white'
                                        : 'bg-[#F1F1F1] text-gray-900'
                                    )}
                                  >
                                    {msg.reply_to && (
                                      <QuotedMessage
                                        message={msg.reply_to}
                                        isOwnMessage={isOwn}
                                        showInBubble={true}
                                        onClick={() => scrollToMessage(msg.reply_to?._id || '')}
                                      />
                                    )}
                                    {msg.content && (
                                      <p className="text-[14px] leading-[21px]">
                                        {msg.content}
                                        {msg.is_edited && (
                                          <span className={cn(
                                            'text-[10px] ml-1 italic',
                                            isOwn ? 'text-white/70' : 'text-gray-500'
                                          )}>
                                            (edited)
                                          </span>
                                        )}
                                      </p>
                                    )}
                                  </div>
                                )}
                                {/* Image/Video outside bubble */}
                                <FileMessage
                                  fileInfo={msg.file_info}
                                  isOwnMessage={isOwn}
                                  onPreview={() => setPreviewFile({
                                    url: msg.file_info?.url || `/api/files/${msg.file_info?.file_id}/download`,
                                    name: msg.file_info?.filename || 'File',
                                    type: msg.file_info?.mime_type || '',
                                    size: msg.file_info?.size || 0
                                  })}
                                />
                              </div>
                            ) : (
                              <div
                                ref={(el) => {
                                  if (el) messageRefs.current.set(messageId, el);
                                }}
                                className={cn(
                                  'px-4 py-2 rounded-xl max-w-md transition-colors duration-500',
                                  isOwn
                                    ? 'bg-[#615EF0] text-white'
                                    : 'bg-[#F1F1F1] text-gray-900'
                                )}
                              >
                                {/* Quoted message (reply_to) */}
                                {msg.reply_to && (
                                  <QuotedMessage
                                    message={msg.reply_to}
                                    isOwnMessage={isOwn}
                                    showInBubble={true}
                                    onClick={() => scrollToMessage(msg.reply_to?._id || '')}
                                  />
                                )}
                                
                                {msg.content && (
                                  <p className="text-[14px] leading-[21px]">
                                    <LinkifiedText text={msg.content} />
                                    {msg.is_edited && (
                                      <span className={cn(
                                        'text-[10px] ml-1 italic',
                                        isOwn ? 'text-white/70' : 'text-gray-500'
                                      )}>
                                        (edited)
                                      </span>
                                    )}
                                  </p>
                                )}
                                
                                {/* Other files inside bubble */}
                                {msg.file_info && (
                                  <FileMessage
                                    fileInfo={msg.file_info}
                                    isOwnMessage={isOwn}
                                    onPreview={() => setPreviewFile({
                                      url: msg.file_info?.url || `/api/files/${msg.file_info?.file_id}/download`,
                                      name: msg.file_info?.filename || 'File',
                                      type: msg.file_info?.mime_type || '',
                                      size: msg.file_info?.size || 0
                                    })}
                                  />
                                )}
                              </div>
                            )}
                            
                            {/* Actions menu for other's messages */}
                            {!isOwn && (
                              <MessageActions
                                isOwnMessage={false}
                                isVisible={hoveredMessageId === messageId}
                                isPinned={pinnedMessages.some(p => p._id === messageId)}
                                canPin={canPinMessages}
                                onReply={() => handleReply(msg)}
                                onReact={(emoji) => handleAddReaction(messageId, emoji)}
                                onPin={() => pinnedMessages.some(p => p._id === messageId) 
                                  ? handleUnpinMessage(messageId) 
                                  : handlePinMessage(messageId)
                                }
                                onThread={() => handleOpenThread(msg)}
                              />
                            )}
                          </div>
                          
                          {/* Reactions */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <MessageReactions
                              reactions={msg.reactions}
                              currentUserId={currentUser?._id || ''}
                              users={usersMap}
                              onAddReaction={(emoji) => handleAddReaction(messageId, emoji)}
                              onRemoveReaction={(emoji) => handleRemoveReaction(messageId, emoji)}
                              isOwnMessage={isOwn}
                            />
                          )}
                          
                          {/* Thread reply count badge */}
                          {threadReplyCounts.get(messageId) && threadReplyCounts.get(messageId)! > 0 && (
                            <button
                              onClick={() => handleOpenThread(msg)}
                              className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs transition-colors',
                                isOwn
                                  ? 'bg-[#615EF0]/10 text-[#615EF0] hover:bg-[#615EF0]/20'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              )}
                            >
                              <MessageCircle className="h-3 w-3" />
                              <span>{threadReplyCounts.get(messageId)} {threadReplyCounts.get(messageId) === 1 ? 'reply' : 'replies'}</span>
                            </button>
                          )}
                        </>
                      )}
                      
                      {/* Read receipts for own messages */}
                      {isOwn && (
                        <div className="flex items-center gap-1 px-1">
                          {(() => {
                            const currentUserId = currentUser?._id?.toString();
                            if (!conversation || !msg.read_by || msg.read_by.length === 0) {
                              // Message sent but not read by anyone
                              return <Check className="w-3.5 h-3.5 text-gray-400" />;
                            }

                            // For direct chat: check if other person read it
                            if (conversation.type === 'direct') {
                              const otherParticipant = conversation.participants?.find(
                                (p) => p.user_id?._id?.toString() !== currentUserId
                              );
                              const otherUserId = otherParticipant?.user_id?._id?.toString() || otherParticipant?.user_id?.toString();
                              
                              return (
                                <SeenStatus
                                  readBy={msg.read_by}
                                  currentUserId={currentUserId || ''}
                                  isGroupChat={false}
                                  otherUserId={otherUserId}
                                />
                              );
                            }

                            // For group chat: show "Seen by X, Y and N others"
                            if (conversation.type === 'group') {
                              const totalParticipants = conversation.participants?.length || 0;

                              return (
                                <SeenStatus
                                  readBy={msg.read_by}
                                  currentUserId={currentUserId || ''}
                                  isGroupChat={true}
                                  totalParticipants={totalParticipants}
                                />
                              );
                            }

                            return <Check className="w-3.5 h-3.5 text-gray-400" />;
                          })()}
                        </div>
                      )}
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

      {/* File Preview Area */}
      <AnimatePresence>
        {selectedFiles.length > 0 && (
          <div className="flex-shrink-0">
            <FilePreview
              files={selectedFiles}
              onRemove={handleRemoveFile}
              disabled={sending}
            />
          </div>
        )}
      </AnimatePresence>
      
      {/* Reply Preview */}
      <AnimatePresence>
        {replyingTo && !activeThread && (
          <div className="flex-shrink-0">
            <ReplyPreview
              replyingTo={replyingTo}
              onCancel={handleCancelReply}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="flex-shrink-0 flex items-center gap-6 px-6 py-6 bg-white border-t border-gray-200 z-10">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button 
          type="button" 
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 text-gray-600 hover:text-gray-900 transition-colors"
          disabled={sending}
        >
          <Paperclip className="w-6 h-6" strokeWidth={1.5} />
        </button>
        
        {/* Vote button - only for group chats */}
        {isGroupChat && (
          <button 
            type="button" 
            onClick={() => setShowCreateVoteModal(true)}
            className="flex-shrink-0 text-gray-600 hover:text-[#615EF0] transition-colors"
            disabled={sending}
            title="Create a vote"
          >
            <Vote className="w-6 h-6" strokeWidth={1.5} />
          </button>
        )}
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedFiles.length > 0) {
              handleSendWithFiles();
            } else {
              handleSendMessage(e);
            }
          }} 
          className="flex-1 flex items-center gap-[10px] px-5 py-2.5 bg-white border-2 border-[#E2E8F0] rounded-xl relative"
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message"
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onFocus={() => {
              // Mark messages as read when user clicks on input
              // Debounce to avoid multiple calls
              if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
              }
              markAsReadTimeoutRef.current = setTimeout(() => {
                markMessagesAsRead();
              }, 300); // 300ms debounce
            }}
            onClick={() => {
              // Also mark as read on click (in case focus doesn't fire)
              // Debounce to avoid multiple calls
              if (markAsReadTimeoutRef.current) {
                clearTimeout(markAsReadTimeoutRef.current);
              }
              markAsReadTimeoutRef.current = setTimeout(() => {
                markMessagesAsRead();
              }, 300); // 300ms debounce
            }}
            className="flex-1 bg-transparent border-none outline-none text-[14px] leading-[21px] text-gray-900 placeholder:text-gray-900 placeholder:opacity-40"
            disabled={sending}
          />
          
          {/* Emoji picker button */}
          <div className="relative">
            <button
              ref={emojiButtonRef}
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className={cn(
                'flex-shrink-0 transition-colors',
                showEmojiPicker ? 'text-[#615EF0]' : 'text-gray-400 hover:text-gray-600'
              )}
              disabled={sending}
            >
              <Smile className="w-5 h-5" strokeWidth={1.5} />
            </button>
            
            {/* Emoji picker popup */}
            <EmojiPicker
              isOpen={showEmojiPicker}
              onClose={() => setShowEmojiPicker(false)}
              onEmojiSelect={handleEmojiSelect}
              triggerRef={emojiButtonRef}
              position="top"
            />
          </div>
          
          <button
            type="submit"
            disabled={(!message.trim() && selectedFiles.length === 0) || sending}
            className={cn(
              "flex-shrink-0 transition-colors",
              (message.trim() || selectedFiles.length > 0) ? "text-[#615EF0] hover:text-[#615EF0]/80" : "text-gray-400"
            )}
          >
            <Send className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </form>
      </div>
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={!!previewFile}
          onClose={() => setPreviewFile(null)}
          file={previewFile}
        />
      )}
      
      {/* Thread Panel */}
      <AnimatePresence>
        {activeThread && (
          <ThreadPanel
            parentMessage={activeThread}
            conversationId={conversationId || ''}
            currentUser={currentUser}
            users={usersMap}
            onClose={handleCloseThread}
            onSendReply={handleSendThreadReply}
            onAddReaction={handleAddReaction}
            onRemoveReaction={handleRemoveReaction}
          />
        )}
      </AnimatePresence>
      
      {/* Create Vote Modal - Group chats only */}
      {isGroupChat && (
        <CreateVoteModal
          open={showCreateVoteModal}
          onOpenChange={setShowCreateVoteModal}
          onCreateVote={handleCreateVote}
        />
      )}
      
      {/* AI Summary Modal */}
      {conversationId && (
        <AISummaryModal
          open={showAISummaryModal}
          onOpenChange={setShowAISummaryModal}
          conversationId={conversationId}
          conversationName={
            conversation?.type === 'group'
              ? conversation.name || 'Group Chat'
              : otherParticipant?.username || 'Chat'
          }
          messageCount={messages.length}
        />
      )}
    </div>
  );
}
