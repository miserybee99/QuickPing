'use client';

import { useState, useEffect } from 'react';
import { Download, FileText, Image, FileSpreadsheet, File, MoreHorizontal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';
import { User, FileAttachment, Conversation } from '@/types';
import { cn } from '@/lib/utils';

interface DirectoryPanelProps {
  conversation?: Conversation | null;
}

export function DirectoryPanel({ conversation }: DirectoryPanelProps) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (conversation) {
      fetchTeamMembers();
      fetchFiles();
    } else {
      setTeamMembers([]);
      setFiles([]);
    }
  }, [conversation]);

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

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return Image;
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return FileSpreadsheet;
    if (mimeType?.includes('pdf')) return FileText;
    if (mimeType?.includes('word') || mimeType?.includes('document')) return FileText;
    return File;
  };

  const getFileColor = (mimeType: string) => {
    if (mimeType?.startsWith('image/')) return 'text-green-500';
    if (mimeType?.includes('pdf')) return 'text-red-500';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'text-blue-500';
    if (mimeType?.includes('spreadsheet') || mimeType?.includes('excel')) return 'text-purple-500';
    return 'text-gray-500';
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

  return (
    <div className="border-l border-gray-200 flex flex-col bg-white shadow-[1px_0px_0px_0px_rgba(0,0,0,0.08)] h-full">
      {/* Header */}
      <div className="flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-6">
          <h2 className="text-[20px] font-semibold">Directory</h2>
          <button className="w-10 h-10 flex items-center justify-center bg-[#EFEFFD] hover:bg-[#615EF0]/20 rounded-full transition-colors">
            <MoreHorizontal className="w-6 h-6 text-[#615EF0]" strokeWidth={2} />
          </button>
        </div>
        <div className="h-px bg-black opacity-[0.08]" />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Team Members */}
        <div className="flex flex-col gap-2 px-4 pt-6">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[14px] font-semibold leading-[21px]">Team Members</h3>
            <div className="px-2 py-0.5 bg-[#EDF2F7] rounded-[24px]">
              <span className="text-[12px] font-semibold">{teamMembers.length}</span>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading...</p>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-gray-500 p-3">
                {conversation ? 'No members found' : 'Select a conversation to see members'}
              </p>
            ) : (
              teamMembers.map((member) => (
                <div key={member._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <Avatar className="h-12 w-12 rounded-xl flex-shrink-0">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback className="rounded-xl bg-gray-200">
                      {member.username[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold leading-[21px] truncate">{member.username}</p>
                    <p className="text-[12px] font-semibold text-gray-900 opacity-40 truncate">
                      {member.mssv || member.role || 'Member'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="h-px bg-black opacity-[0.08] my-6" />

        {/* Files */}
        <div className="flex flex-col gap-2 px-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-[14px] font-semibold leading-[21px]">Files</h3>
            <div className="px-2 py-0.5 bg-[#EDF2F7] rounded-[24px]">
              <span className="text-[12px] font-semibold">{files.length}</span>
            </div>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-gray-500">Loading files...</p>
            ) : files.length === 0 ? (
              <p className="text-sm text-gray-500 p-3">
                {conversation ? 'No files in this conversation' : 'Select a conversation to see files'}
              </p>
            ) : (
              files.map((file) => {
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
                    key={file._id}
                    className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
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
                      onClick={(e) => {
                        e.stopPropagation();
                        if (file.url && file.url !== '#') {
                          window.open(file.url, '_blank');
                        }
                      }}
                      className="flex-shrink-0 text-[#615EF0] hover:text-[#615EF0]/80 transition-colors"
                    >
                      <Download className="w-5 h-5" strokeWidth={1.5} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
