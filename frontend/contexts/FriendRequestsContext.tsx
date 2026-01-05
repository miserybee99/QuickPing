'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { apiClient } from '@/lib/api-client';

interface FriendRequestsContextType {
  pendingCount: number;
  refreshRequests: () => Promise<void>;
}

const FriendRequestsContext = createContext<FriendRequestsContextType>({
  pendingCount: 0,
  refreshRequests: async () => {},
});

export const useFriendRequests = () => useContext(FriendRequestsContext);

interface FriendRequestsProviderProps {
  children: ReactNode;
}

export function FriendRequestsProvider({ children }: FriendRequestsProviderProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const { socket } = useSocket();

  const refreshRequests = useCallback(async () => {
    // Only fetch if we're in the browser
    if (typeof window === 'undefined') return;
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setPendingCount(0);
        return;
      }

      const response = await apiClient.friends.getRequests();
      const requests = response?.data?.requests || [];
      setPendingCount(requests.length);
    } catch (error: any) {
      // Silently handle errors - don't break the app
      console.error('Error fetching friend requests:', error);
      setPendingCount(0);
    }
  }, []);

  // Fetch initial count only after mount and if authenticated
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Delay to ensure auth state is ready and socket is connected
    const timer = setTimeout(() => {
      refreshRequests().catch(() => {
        // Ignore errors - already handled in refreshRequests
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [refreshRequests]);

  // Listen for real-time friend request updates
  useEffect(() => {
    if (!socket) return;

    // Listen for new friend request received
    const handleFriendRequestReceived = (data: {
      from_user: { _id: string; username: string; avatar_url?: string };
      friendship_id: string;
    }) => {
      console.log('📨 Friend request received in real-time:', data);
      // Increment count
      setPendingCount(prev => prev + 1);
    };

    // Listen for friendship status changes (accept/reject)
    const handleFriendshipStatusChanged = (data: {
      user_id: string;
      friend_id: string;
      status: string;
      friendship_id: string;
    }) => {
      console.log('👫 Friendship status changed in real-time:', data);
      // Refresh count when status changes
      refreshRequests();
    };

    socket.on('friend_request_received', handleFriendRequestReceived);
    socket.on('friendship_status_changed', handleFriendshipStatusChanged);

    return () => {
      socket.off('friend_request_received', handleFriendRequestReceived);
      socket.off('friendship_status_changed', handleFriendshipStatusChanged);
    };
  }, [socket, refreshRequests]);

  return (
    <FriendRequestsContext.Provider value={{ pendingCount, refreshRequests }}>
      {children}
    </FriendRequestsContext.Provider>
  );
}

