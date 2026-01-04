/**
 * API CLIENT WRAPPER
 *
 * Provides unified interface for Real API
 */

import api from './api';

// Real API implementation (maps to backend endpoints)
const apiClient = {
  // ==========================================================================
  // AUTH
  // ==========================================================================
  auth: {
    login: async (email: string, password: string) => {
      return await api.post('/auth/login', { email, password });
    },

    register: async (data: { email: string; username: string; password: string; mssv?: string }) => {
      return await api.post('/auth/register', data);
    },

    logout: async () => {
      return await api.post('/auth/logout');
    },

    me: async () => {
      return await api.get('/auth/me');
    },
  },

  // ==========================================================================
  // CONVERSATIONS
  // ==========================================================================
  conversations: {
    getAll: async () => {
      return await api.get('/conversations');
    },

    getById: async (id: string) => {
      return await api.get(`/conversations/${id}`);
    },

    createDirect: async (userId: string) => {
      return await api.post('/conversations/direct', { userId });
    },

    createGroup: async (data: { name: string; description?: string; participant_ids: string[] }) => {
      return await api.post('/conversations/group', {
        name: data.name,
        description: data.description,
        participants: data.participant_ids,
      });
    },

    update: async (id: string, data: { name?: string; description?: string; avatar_url?: string; participants?: any[] }) => {
      return await api.put(`/conversations/${id}`, data);
    },

    changeParticipantRole: async (conversationId: string, userId: string, role: 'admin' | 'moderator' | 'member') => {
      return await api.put(`/conversations/${conversationId}/participants/${userId}/role`, { role });
    },

    removeParticipant: async (conversationId: string, userId: string) => {
      return await api.delete(`/conversations/${conversationId}/participants/${userId}`);
    },

    pinMessage: async (conversationId: string, messageId: string) => {
      return await api.post(`/conversations/${conversationId}/pin`, { message_id: messageId });
    },

    unpinMessage: async (conversationId: string, messageId: string) => {
      return await api.delete(`/conversations/${conversationId}/pin/${messageId}`);
    },
  },

  // ==========================================================================
  // MESSAGES
  // ==========================================================================
  messages: {
    getByConversation: async (conversationId: string) => {
      return await api.get(`/messages/conversation/${conversationId}`);
    },

    send: async (data: { conversation_id: string; content: string; type?: string; reply_to?: string; thread_id?: string }) => {
      return await api.post('/messages', data);
    },

    edit: async (messageId: string, content: string) => {
      return await api.put(`/messages/${messageId}`, { content });
    },

    addReaction: async (messageId: string, emoji: string) => {
      return await api.post(`/messages/${messageId}/reaction`, { emoji });
    },

    removeReaction: async (messageId: string, emoji: string) => {
      return await api.delete(`/messages/${messageId}/reaction/${emoji}`);
    },

    markAsRead: async (messageId: string) => {
      return await api.post(`/messages/${messageId}/read`);
    },

    getThreadReplies: async (threadId: string) => {
      return await api.get(`/messages/thread/${threadId}`);
    },
  },

  // ==========================================================================
  // USERS
  // ==========================================================================
  users: {
    search: async (query: string) => {
      return await api.get(`/users/search?query=${encodeURIComponent(query)}`);
    },

    updateProfile: async (data: { username?: string; bio?: string; avatar_url?: string }) => {
      return await api.put('/users/profile', data);
    },

    updatePreferences: async (data: { theme?: 'light' | 'dark'; font_size?: 'small' | 'medium' | 'large' }) => {
      return await api.put('/users/preferences', data);
    },
  },

  // ==========================================================================
  // FRIENDS
  // ==========================================================================
  friends: {
    getAll: async () => {
      return await api.get('/friends');
    },

    getRequests: async () => {
      return await api.get('/friends/requests');
    },

    sendRequest: async (friendId: string) => {
      return await api.post('/friends/request', { friend_id: friendId });
    },

    acceptRequest: async (friendshipId: string) => {
      return await api.put(`/friends/request/${friendshipId}`, { status: 'accepted' });
    },

    rejectRequest: async (friendshipId: string) => {
      return await api.put(`/friends/request/${friendshipId}`, { status: 'rejected' });
    },

    // Check friendship status with a specific user
    checkStatus: async (userId: string) => {
      return await api.get(`/friends/status/${userId}`);
    },

    // Remove friend (unfriend)
    remove: async (friendId: string) => {
      return await api.delete(`/friends/${friendId}`);
    },
  },

  // ==========================================================================
  // FILES
  // ==========================================================================
  files: {
    upload: async (file: File, conversationId?: string, onProgress?: (progress: number) => void) => {
      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      return await api.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(progress);
          }
        },
      });
    },

    uploadMultiple: async (
      files: File[],
      conversationId?: string,
      onProgress?: (fileIndex: number, progress: number) => void
    ) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });
      if (conversationId) {
        formData.append('conversation_id', conversationId);
      }

      return await api.post('/files/upload-multiple', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            // Approximate which file we're on based on progress
            const fileIndex = Math.min(
              Math.floor((progress / 100) * files.length),
              files.length - 1
            );
            onProgress(fileIndex, progress);
          }
        },
      });
    },

    getInfo: async (fileId: string) => {
      return await api.get(`/files/${fileId}`);
    },

    getDownloadUrl: (fileId: string) => {
      return `/api/files/${fileId}/download`;
    },
  },

  // ==========================================================================
  // VOTES
  // ==========================================================================
  votes: {
    create: async (data: {
      conversation_id: string;
      question: string;
      options: string[];
      settings?: { allow_multiple?: boolean; anonymous?: boolean };
      expires_at?: string;
    }) => {
      return await api.post('/votes', data);
    },

    getByConversation: async (conversationId: string) => {
      return await api.get(`/votes/conversation/${conversationId}`);
    },

    vote: async (voteId: string, optionIndex: number) => {
      return await api.post(`/votes/${voteId}/vote`, { option_index: optionIndex });
    },

    getById: async (voteId: string) => {
      return await api.get(`/votes/${voteId}`);
    },

    delete: async (voteId: string) => {
      return await api.delete(`/votes/${voteId}`);
    },
  },

  // ==========================================================================
  // AI
  // ==========================================================================
  ai: {
    summarize: async (conversationId: string) => {
      const response = await api.post('/ai/summarize', {
        conversation_id: conversationId,
        type: 'conversation',
      });
      return response.data;
    },

    summarizeThread: async (threadId: string) => {
      const response = await api.post('/ai/summarize', {
        thread_id: threadId,
        type: 'thread',
      });
      return response.data;
    },
  },

  // ==========================================================================
  // DEADLINES
  // ==========================================================================
  deadlines: {
    create: async (data: {
      conversation_id: string;
      title: string;
      description?: string;
      due_date: string; // ISO date string
      priority?: 'low' | 'medium' | 'high';
    }) => {
      return await api.post('/deadlines', data);
    },

    getByConversation: async (conversationId: string, filters?: {
      status?: 'pending' | 'completed' | 'cancelled';
      priority?: 'low' | 'medium' | 'high';
      sort?: 'due_date' | '-due_date';
    }) => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.sort) params.append('sort', filters.sort);
      const queryString = params.toString();
      return await api.get(`/deadlines/conversation/${conversationId}${queryString ? `?${queryString}` : ''}`);
    },

    getUserDeadlines: async () => {
      return await api.get('/deadlines/user');
    },

    getUpcoming: async () => {
      return await api.get('/deadlines/upcoming');
    },

    update: async (deadlineId: string, data: {
      title?: string;
      description?: string;
      due_date?: string;
      priority?: 'low' | 'medium' | 'high';
      status?: 'pending' | 'completed' | 'cancelled';
    }) => {
      return await api.put(`/deadlines/${deadlineId}`, data);
    },

    delete: async (deadlineId: string) => {
      return await api.delete(`/deadlines/${deadlineId}`);
    },
  },
};

// Export the API client
export { apiClient };
export default apiClient;

