'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Image, FileSpreadsheet, File, MoreHorizontal, UserPlus, LogOut, Settings, Loader2, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import { User, FileAttachment, Conversation } from '@/types';
import { cn } from '@/lib/utils';
import { getFileUrl } from '@/lib/file-utils';
import { AddMembersModal } from '@/components/modals/add-members-modal';
import { RoleManagementModal } from '@/components/modals/role-management-modal';
import { GroupSettingsModal } from '@/components/modals/group-settings-modal';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { useSocket } from '@/contexts/SocketContext';
import { RoleBadge, RoleIcon } from '@/components/ui/role-badge';
import { StatusIndicator } from '@/components/ui/status-indicator';

// Download file with authentication
async function downloadFileFromUrl(file: FileAttachment): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace('/api', '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  if (!file.url || file.url === '#') return;

  const downloadUrl = `${baseUrl}/api/files/proxy-download?url=${encodeURIComponent(file.url)}&filename=${encodeURIComponent(file.original_name)}`;

  try {
    const response = await fetch(downloadUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.original_name;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    // Fallback: open in new tab
    window.open(file.url, '_blank');
  }
}

interface DirectoryPanelProps {
  conversation?: Conversation | null;
  onConversationUpdated?: (conversation: Conversation) => void;
}

export function DirectoryPanel({ conversation, onConversationUpdated }: DirectoryPanelProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [isMembersExpanded, setIsMembersExpanded] = useState(false);
  const [isFilesExpanded, setIsFilesExpanded] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'moderator' | 'member'>('member');
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { isUserOnline } = useUserStatus();
  const { socket } = useSocket();

  useEffect(() => {
    if (conversation) {
      fetchTeamMembers();
      fetchFiles();
      checkUserRole();
    } else {
      setTeamMembers([]);
      setFiles([]);
      setCurrentUserRole('member');
    }
  }, [conversation]);

  // Socket listener for realtime file updates
  useEffect(() => {
    if (!socket || !conversation) return;

    const handleNewMessage = (data: any) => {
      // If message contains a file, add it to files list
      if (data.message && data.conversation_id === conversation._id) {
        const msg = data.message;
        if (msg.file_info || msg.type === 'file' || msg.type === 'image') {
          const newFile: FileAttachment = {
            _id: msg.file_info?.file_id || msg._id,
            original_name: msg.file_info?.filename || 'File',
            stored_name: msg.file_info?.filename || 'file',
            url: msg.file_info?.url || '#',
            mime_type: msg.file_info?.mime_type || 'application/octet-stream',
            size: msg.file_info?.size || 0,
            uploader_id: msg.sender_id,
            conversation_id: conversation._id,
            message_id: msg._id,
            upload_date: msg.created_at,
          };
          setFiles(prev => [newFile, ...prev].slice(0, 10)); // Keep only latest 10 files
        }
      }
    };

    // Handle conversation updates (role changes, etc.)
    const handleConversationUpdated = (data: any) => {
      if (data.conversation && data.conversation._id === conversation._id) {
        // Update the conversation in parent component
        onConversationUpdated?.(data.conversation);
        // Re-check user role with updated data
        const currentUserId = typeof window !== 'undefined' && localStorage.getItem('user')
          ? JSON.parse(localStorage.getItem('user')!)._id
          : null;
        const participant = data.conversation.participants?.find(
          (p: any) => p.user_id?._id === currentUserId
        );
        setCurrentUserRole(participant?.role || 'member');
      }
    };

    socket.on('message_received', handleNewMessage);
    socket.on('conversation_updated', handleConversationUpdated);

    return () => {
      socket.off('message_received', handleNewMessage);
      socket.off('conversation_updated', handleConversationUpdated);
    };
  }, [socket, conversation, onConversationUpdated]);

  const checkUserRole = () => {
    if (!conversation || conversation.type !== 'group') {
      setCurrentUserRole('member');
      return;
    }

    const currentUserId = typeof window !== 'undefined' && localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user')!)._id
      : null;

    const participant = conversation.participants?.find(
      (p) => p.user_id?._id === currentUserId
    );

    setCurrentUserRole(participant?.role || 'member');
  };

  const fetchTeamMembers = async () => {
    if (!conversation) return;
    
    try {
      // Get team members from conversation participants
      const members = conversation.participants
        ?.map(p => p.user_id)
        .filter((user): user is User => user !== null && user !== undefined) || [];
      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchFiles = async () => {
    if (!conversation) {
      setFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Try to get files from messages in conversation
      // Since there's no direct endpoint, we'll get from messages
      const messagesResponse = await api.get<{ messages: any[] }>(
        `/messages/conversation/${conversation._id}`
      );
      
      // Extract files from messages
      const messageFiles = messagesResponse.data.messages
        ?.filter(msg => msg.file_info || msg.type === 'file' || msg.type === 'image')
        .map(msg => ({
          _id: msg.file_info?.file_id || msg._id,
          original_name: msg.file_info?.filename || 'File',
          stored_name: msg.file_info?.filename || 'file',
          url: msg.file_info?.url || '#',
          mime_type: msg.file_info?.mime_type || 'application/octet-stream',
          size: msg.file_info?.size || 0,
          uploader_id: msg.sender_id,
          conversation_id: conversation._id,
          message_id: msg._id,
          upload_date: msg.created_at,
        }))
        .slice(0, 10) || [];
      
      setFiles(messageFiles);
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const getFileExtension = (filename: string): string => {
    return filename.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const handleMembersAdded = async () => {
    // Reload conversation data
    if (conversation) {
      try {
        await api.get(`/conversations/${conversation._id}`);
        // Update team members with new data
        fetchTeamMembers();
      } catch (error) {
        console.error('Error reloading conversation:', error);
      }
    }
  };

  const canAddMembers = conversation?.type === 'group' && 
    (currentUserRole === 'admin' || currentUserRole === 'moderator');

  const getMemberRole = (memberId: string): 'admin' | 'moderator' | 'member' => {
    if (!conversation) return 'member';
    const participant = conversation.participants?.find(
      (p) => (p.user_id?._id?.toString() || p.user_id?.toString()) === memberId
    );
    return participant?.role || 'member';
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'moderator' | 'member') => {
    if (!conversation) return;
    
    try {
      await apiClient.conversations.changeParticipantRole(conversation._id, memberId, newRole);
      // Reload conversation to get updated data
      const response = await api.get(`/conversations/${conversation._id}`);
      const updatedConversation = response.data.conversation;
      fetchTeamMembers();
      // Notify parent component of conversation update
      onConversationUpdated?.(updatedConversation);
    } catch (error: any) {
      console.error('Error changing role:', error);
      alert(error?.response?.data?.error || 'Could not change role. Please try again.');
    }
  };

  const openRoleModal = (member: User) => {
    setSelectedMember(member);
    setRoleModalOpen(true);
  };

  const handleRoleChangeFromModal = async (newRole: 'admin' | 'moderator' | 'member') => {
    if (!selectedMember) return;
    await handleChangeRole(selectedMember._id, newRole);
  };

  const handleRemoveMemberFromModal = async () => {
    if (!selectedMember || !conversation) return;
    await apiClient.conversations.removeParticipant(conversation._id, selectedMember._id);
    fetchTeamMembers();
    const response = await api.get(`/conversations/${conversation._id}`);
    const updatedConversation = response.data.conversation;
    onConversationUpdated?.(updatedConversation);
  };

  const handleLeaveGroup = async () => {
    if (!conversation) return;
    
    if (!confirm('Are you sure you want to leave this group?')) {
      return;
    }
    
    const currentUserId = typeof window !== 'undefined' && localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user')!)._id
      : null;
    
    if (!currentUserId) return;
    
    try {
      await apiClient.conversations.removeParticipant(conversation._id, currentUserId);
      // Redirect to groups page or home
      window.location.href = '/groups';
    } catch (error: any) {
      console.error('Error leaving group:', error);
      alert(error?.response?.data?.error || 'Could not leave group. Please try again.');
    }
  };

  const canManageMember = (memberId: string): boolean => {
    if (!conversation || conversation.type !== 'group') return false;
    if (currentUserRole !== 'admin') return false; // Only admins can manage members
    
    const currentUserId = typeof window !== 'undefined' && localStorage.getItem('user')
      ? JSON.parse(localStorage.getItem('user')!)._id
      : null;
    
    // Cannot manage yourself
    if (memberId === currentUserId) return false;
    
    return true;
  };

  return (
    <div className="border-l border-gray-200 flex flex-col bg-white shadow-[1px_0px_0px_0px_rgba(0,0,0,0.08)] h-screen overflow-hidden">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-6">
          <h2 className="text-[20px] font-semibold">Directory</h2>
          {conversation?.type === 'group' ? (
            <button 
              onClick={() => setSettingsModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-[#EFEFFD] hover:bg-[#615EF0]/20 rounded-full transition-colors"
              title="Group Settings"
            >
              <Settings className="w-6 h-6 text-[#615EF0]" strokeWidth={2} />
            </button>
          ) : (
            <button className="w-10 h-10 flex items-center justify-center bg-[#EFEFFD] hover:bg-[#615EF0]/20 rounded-full transition-colors">
              <MoreHorizontal className="w-6 h-6 text-[#615EF0]" strokeWidth={2} />
            </button>
          )}
        </div>
        <div className="h-px bg-black opacity-[0.08]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Team Members */}
        <div className="flex flex-col px-4 pt-6">
          <div
            onClick={() => setIsMembersExpanded(!isMembersExpanded)}
            className="flex items-center justify-between mb-2 w-full hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold leading-[21px]">Team Members</h3>
              <div className="px-2 py-0.5 bg-[#EDF2F7] rounded-[24px]">
                <span className="text-[12px] font-semibold">{teamMembers.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canAddMembers && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setAddMembersOpen(true);
                  }}
                  className="w-8 h-8 flex items-center justify-center bg-[#615EF0]/10 hover:bg-[#615EF0]/20 rounded-full transition-colors"
                  title="Add members"
                >
                  <UserPlus className="w-4 h-4 text-[#615EF0]" />
                </button>
              )}
              <ChevronDown 
                className={cn(
                  "w-5 h-5 text-gray-500 transition-transform duration-200",
                  !isMembersExpanded && "-rotate-90"
                )} 
              />
            </div>
          </div>

          {isMembersExpanded && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {loading ? (
                <p className="text-sm text-gray-500">Loading...</p>
              ) : teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 p-3">
                  {conversation ? 'No members found' : 'Select a conversation to see members'}
                </p>
              ) : (
                teamMembers.map((member) => {
                  const memberRole = getMemberRole(member._id);
                  const canManage = canManageMember(member._id);

                  return (
                    <div key={member._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors group">
                      <div className="relative">
                        <Avatar className="h-12 w-12 rounded-xl flex-shrink-0">
                          <AvatarImage src={getFileUrl(member.avatar_url)} />
                        <AvatarFallback className="rounded-xl bg-gray-200">
                          {member.username[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <StatusIndicator 
                        isOnline={isUserOnline(member._id)} 
                        size="md"
                        showOffline={false}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[14px] font-semibold leading-[21px] truncate">{member.username}</p>
                        <RoleIcon role={memberRole} size="sm" />
                      </div>
                      <div className="flex items-center gap-2">
                        {conversation?.type === 'group' && (
                          <RoleBadge role={memberRole} size="sm" showIcon={false} />
                        )}
                        {member.mssv && (
                          <span className="text-[11px] text-gray-500">• {member.mssv}</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Role management - open modal */}
                    {canManage && conversation?.type === 'group' && (
                      <button 
                        onClick={() => openRoleModal(member)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-[#615EF0]/10 rounded-lg"
                        title="Manage Role"
                      >
                        <MoreHorizontal className="w-4 h-4 text-[#615EF0]" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
            </div>
          )}
        </div>

        <div className="h-px bg-black opacity-[0.08] my-6" />

        {/* Files */}
        <div className="flex flex-col px-4">
          <button
            onClick={() => setIsFilesExpanded(!isFilesExpanded)}
            className="flex items-center justify-between mb-2 w-full hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors"
          >
            <div className="flex items-center gap-2">
              <h3 className="text-[14px] font-semibold leading-[21px]">Files</h3>
              <div className="px-2 py-0.5 bg-[#EDF2F7] rounded-[24px]">
                <span className="text-[12px] font-semibold">{files.length}</span>
              </div>
            </div>
            <ChevronDown 
              className={cn(
                "w-5 h-5 text-gray-500 transition-transform duration-200",
                !isFilesExpanded && "-rotate-90"
              )} 
            />
          </button>

          {isFilesExpanded && (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {loading ? (
              <p className="text-sm text-gray-500">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-500 p-3">
                {conversation ? 'No files in this conversation' : 'Select a conversation to see files'}
              </p>
            ) : (
              files.map((file, index) => {
                const extension = getFileExtension(file.original_name);
                const getBgColor = () => {
                  if (file.mime_type?.startsWith('image/')) return 'bg-[#F0FFF4]';
                  if (file.mime_type?.includes('pdf')) return 'bg-[#FFF5F5]';
                  if (file.mime_type?.includes('word') || file.mime_type?.includes('document')) return 'bg-[#EBF8FF]';
                  if (file.mime_type?.includes('spreadsheet') || file.mime_type?.includes('excel')) return 'bg-[#FAF5FF]';
                  return 'bg-gray-100';
                };
                
                const getIconColor = () => {
                  if (file.mime_type?.startsWith('image/')) return 'text-[#48BB78]';
                  if (file.mime_type?.includes('pdf')) return 'text-[#F56565]';
                  if (file.mime_type?.includes('word') || file.mime_type?.includes('document')) return 'text-[#4299E1]';
                  if (file.mime_type?.includes('spreadsheet') || file.mime_type?.includes('excel')) return 'text-[#9F7AEA]';
                  return 'text-gray-600';
                };

                return (
                  <div
                    key={`${file._id}-${file.message_id}-${index}`}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className={cn('w-12 h-12 flex items-center justify-center rounded-xl', getBgColor())}>
                      {file.mime_type?.includes('pdf') && (
                        <FileText className={cn('h-6 w-6', getIconColor())} strokeWidth={1.5} />
                      )}
                      {file.mime_type?.startsWith('image/') && (
                        <Image className={cn('h-6 w-6', getIconColor())} strokeWidth={1.5} />
                      )}
                      {(file.mime_type?.includes('word') || file.mime_type?.includes('document')) && (
                        <FileText className={cn('h-6 w-6', getIconColor())} strokeWidth={1.5} />
                      )}
                      {(file.mime_type?.includes('spreadsheet') || file.mime_type?.includes('excel')) && (
                        <FileSpreadsheet className={cn('h-6 w-6', getIconColor())} strokeWidth={1.5} />
                      )}
                      {!['pdf', 'image', 'word', 'document', 'spreadsheet', 'excel'].some(t => file.mime_type?.includes(t)) && (
                        <File className={cn('h-6 w-6', getIconColor())} strokeWidth={1.5} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold leading-[21px] truncate">{file.original_name}</p>
                      <div className="flex gap-2.5">
                        <span className="text-[12px] font-semibold text-gray-900 opacity-40">{extension}</span>
                        <span className="text-[12px] font-semibold text-gray-900 opacity-40">{formatFileSize(file.size)}</span>
                      </div>
                    </div>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (file.url && file.url !== '#' && !downloadingFileId) {
                          setDownloadingFileId(file._id);
                          try {
                            await downloadFileFromUrl(file);
                          } finally {
                            setDownloadingFileId(null);
                          }
                        }
                      }}
                      disabled={downloadingFileId === file._id}
                      className="flex-shrink-0 text-[#615EF0] hover:text-[#615EF0]/80 transition-colors cursor-pointer disabled:cursor-wait"
                      style={{ pointerEvents: (!file.url || file.url === '#') ? 'none' : 'auto', opacity: (!file.url || file.url === '#') ? 0.5 : 1 }}
                    >
                      {downloadingFileId === file._id ? (
                        <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} />
                      ) : (
                        <Download className="w-5 h-5" strokeWidth={1.5} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
            </div>
          )}
        </div>
      </div>

      {/* Leave Group Button for group chats */}
      {conversation && conversation.type === 'group' && (
        <div className="border-t border-gray-200 p-4">
          <Button
            variant="outline"
            className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleLeaveGroup}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Leave Group
          </Button>
        </div>
      )}

      {/* Add Members Modal */}
      {conversation && conversation.type === 'group' && (
        <AddMembersModal
          open={addMembersOpen}
          onOpenChange={setAddMembersOpen}
          conversationId={conversation._id}
          currentMembers={teamMembers.map((m) => m._id)}
          onMembersAdded={handleMembersAdded}
        />
      )}

      {/* Role Management Modal */}
      {selectedMember && conversation && (
        <RoleManagementModal
          open={roleModalOpen}
          onOpenChange={(open) => {
            setRoleModalOpen(open);
            if (!open) setSelectedMember(null);
          }}
          member={selectedMember}
          currentRole={getMemberRole(selectedMember._id)}
          currentUserRole={currentUserRole}
          onRoleChange={handleRoleChangeFromModal}
          onRemoveMember={handleRemoveMemberFromModal}
        />
      )}

      {/* Group Settings Modal */}
      {conversation && conversation.type === 'group' && (
        <GroupSettingsModal
          open={settingsModalOpen}
          onOpenChange={setSettingsModalOpen}
          conversation={conversation}
          currentUserId={typeof window !== 'undefined' && localStorage.getItem('user')
            ? JSON.parse(localStorage.getItem('user')!)._id
            : ''}
          currentUserRole={currentUserRole}
          onConversationUpdated={(updatedConversation) => {
            onConversationUpdated?.(updatedConversation);
          }}
          onLeaveGroup={async () => {
            const currentUserId = typeof window !== 'undefined' && localStorage.getItem('user')
              ? JSON.parse(localStorage.getItem('user')!)._id
              : null;
            if (!currentUserId) return;
            await apiClient.conversations.removeParticipant(conversation._id, currentUserId);
            window.location.href = '/groups';
          }}
          onDeleteGroup={async () => {
            await api.delete(`/conversations/${conversation._id}`);
            window.location.href = '/groups';
          }}
        />
      )}
    </div>
  );
}
