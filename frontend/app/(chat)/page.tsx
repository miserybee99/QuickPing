'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MessagesPanel } from '@/components/chat/messages-panel';
import { ChatPanel } from '@/components/chat/chat-panel';
import { DirectoryPanel } from '@/components/chat/directory-panel';
import { Conversation } from '@/types';
import { useUser } from '@/hooks/useUser';

function ChatContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Auto-select conversation from URL query parameter
  useEffect(() => {
    if (!isClient) return;
    
    const conversationId = searchParams.get('conversation');
    if (conversationId) {
      setSelectedConversationId(conversationId);
    }
  }, [searchParams, isClient]);

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
    <div className="grid h-screen" style={{ gridTemplateColumns: '349px 1fr 362px' }}>
      {/* Messages List */}
      <MessagesPanel 
        selectedId={selectedConversationId}
        onSelect={handleSelectConversation}
      />
      
      {/* Chat Window */}
      <div className="h-screen overflow-hidden">
        <ChatPanel 
          conversationId={selectedConversationId}
          onConversationLoaded={setSelectedConversation}
        />
      </div>
      
      {/* Directory (Team Members & Files) */}
      <DirectoryPanel 
        conversation={selectedConversation}
        onConversationUpdated={setSelectedConversation}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}

