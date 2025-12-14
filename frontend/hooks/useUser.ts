'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from '@/types';

// Custom event for user data updates within the same tab
const USER_UPDATE_EVENT = 'quickping-user-update';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    setIsClient(true);
    loadUser();

    // Listen for storage changes (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user') {
        loadUser();
      }
    };

    // Listen for custom event (same tab)
    const handleUserUpdate = () => {
      loadUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener(USER_UPDATE_EVENT, handleUserUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener(USER_UPDATE_EVENT, handleUserUpdate);
    };
  }, [loadUser]);

  // Function to update user and notify all hooks
  const updateUser = useCallback((newUser: User | null) => {
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
    setUser(newUser);
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event(USER_UPDATE_EVENT));
  }, []);

  // Function to refresh user data from localStorage
  const refreshUser = useCallback(() => {
    loadUser();
  }, [loadUser]);

  return { user, isClient, isLoading, updateUser, refreshUser };
}

