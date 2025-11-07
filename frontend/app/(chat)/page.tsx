'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessagesPanel } from '@/components/chat/messages-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { DirectoryPanel } from '@/components/chat/directory-panel';
import { Conversation } from '@/types';
import { useUser } from '@/hooks/useUser';

export default function ChatPage() {
  const router = useRouter();
  const { user, isClient } = useUser();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  useEffect(() => {
    // Wait for client-side hydration to complete
    if (!isClient) return;

    // Check token directly from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token || !user) {
      console.log('🚪 No token or user, redirecting to login...');
      router.push('/login');
    }
  }, [isClient, user, router]);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Conversation will be loaded by ChatPanel
  };

  // Show loading while checking auth
  if (!isClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If no user after loading, will redirect via useEffect
  if (!user) {
    return null;
  }

  return (
    <div className="grid h-full bg-background" style={{ gridTemplateColumns: '349px 1fr 362px' }}>
      {/* Messages List */}
      <MessagesPanel 
        selectedId={selectedConversationId}
        onSelect={handleSelectConversation}
      />
      
      {/* Chat Window */}
      <ChatPanel 
        conversationId={selectedConversationId}
        onConversationLoaded={setSelectedConversation}
      />
      
      {/* Directory (Team Members & Files) */}
      <DirectoryPanel conversation={selectedConversation} />
    </div>
  );
}

