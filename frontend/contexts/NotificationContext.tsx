'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { apiClient } from '@/lib/api-client';

interface NotificationCounts {
  friendRequests: number;
  unreadMessages: number;
  total: number;
}

interface NotificationContextType {
  counts: NotificationCounts;
  refreshCounts: () => Promise<void>;
  clearFriendRequests: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  counts: { friendRequests: 0, unreadMessages: 0, total: 0 },
  refreshCounts: async () => {},
  clearFriendRequests: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { socket } = useSocket();
  const [counts, setCounts] = useState<NotificationCounts>({
    friendRequests: 0,
    unreadMessages: 0,
    total: 0,
  });

  const refreshCounts = useCallback(async () => {
    try {
      // Check if user is logged in
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      // Fetch friend requests count
      const requestsRes = await apiClient.friends.getRequests();
      const friendRequests = requestsRes.data.requests?.length || 0;

      // Calculate total
      const total = friendRequests;

      setCounts({
        friendRequests,
        unreadMessages: 0, // TODO: Add unread messages API
        total,
      });
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  }, []);

  const clearFriendRequests = useCallback(() => {
    setCounts(prev => ({
      ...prev,
      friendRequests: 0,
      total: prev.total - prev.friendRequests,
    }));
  }, []);

  // Initial fetch
  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  // Listen for socket events
  useEffect(() => {
    if (!socket) return;

    // When receiving a new friend request
    const handleFriendRequest = () => {
      setCounts(prev => ({
        ...prev,
        friendRequests: prev.friendRequests + 1,
        total: prev.total + 1,
      }));
    };

    // When friend request is accepted/rejected
    const handleFriendRequestUpdated = () => {
      refreshCounts();
    };

    // When receiving a new message (optional - for future use)
    const handleNewMessage = () => {
      // Could increment unread count here if needed
    };

    socket.on('friend_request_received', handleFriendRequest);
    socket.on('friend_request_accepted', handleFriendRequestUpdated);
    socket.on('friend_request_rejected', handleFriendRequestUpdated);
    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('friend_request_received', handleFriendRequest);
      socket.off('friend_request_accepted', handleFriendRequestUpdated);
      socket.off('friend_request_rejected', handleFriendRequestUpdated);
      socket.off('new_message', handleNewMessage);
    };
  }, [socket, refreshCounts]);

  return (
    <NotificationContext.Provider value={{ counts, refreshCounts, clearFriendRequests }}>
      {children}
    </NotificationContext.Provider>
  );
}

