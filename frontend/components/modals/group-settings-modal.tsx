'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  X,
  Save,
  Trash2,
  AlertTriangle,
  Users,
  LogOut,
  Crown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types';
import api from '@/lib/api';

interface GroupSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: Conversation;
  currentUserId: string;
  currentUserRole: 'admin' | 'moderator' | 'member';
  onConversationUpdated: (conversation: Conversation) => void;
  onLeaveGroup?: () => Promise<void>;
  onDeleteGroup?: () => Promise<void>;
}

type ConfirmAction = 'leave' | 'delete' | 'transfer' | null;

export function GroupSettingsModal({
  open,
  onOpenChange,
  conversation,
  currentUserId,
  currentUserRole,
  onConversationUpdated,
  onLeaveGroup,
  onDeleteGroup,
}: GroupSettingsModalProps) {
  const [name, setName] = useState(conversation.name || '');
  const [description, setDescription] = useState(conversation.description || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is the last admin
  const admins = conversation.participants?.filter(p => p.role === 'admin') || [];
  const isLastAdmin = currentUserRole === 'admin' && admins.length === 1;
  const otherMembers = conversation.participants?.filter(
    p => p.user_id?._id !== currentUserId
  ) || [];

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(conversation.name || '');
      setDescription(conversation.description || '');
      setAvatarPreview(null);
      setAvatarFile(null);
      setHasChanges(false);
      setConfirmAction(null);
      setSelectedNewAdmin(null);
    }
  }, [open, conversation]);

  // Track changes
  useEffect(() => {
    const nameChanged = name !== (conversation.name || '');
    const descriptionChanged = description !== (conversation.description || '');
    const avatarChanged = avatarPreview !== null;
    setHasChanges(nameChanged || descriptionChanged || avatarChanged);
  }, [name, description, avatarPreview, conversation]);

  const canEdit = currentUserRole === 'admin' || currentUserRole === 'moderator';
  const canDelete = currentUserRole === 'admin';

  const handleAvatarClick = () => {
    if (canEdit) {
      fileInputRef.current?.click();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!canEdit || !hasChanges) return;

    setIsSaving(true);
    try {
      let newAvatarUrl: string | undefined;
      
      // Upload avatar if changed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('folder', 'group-avatars');
        
        const uploadResponse = await api.post('/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (uploadResponse.data?.file?.url) {
          newAvatarUrl = uploadResponse.data.file.url;
        }
      }
      
      const updateData: { name?: string; description?: string; avatar_url?: string } = {};
      
      if (name !== conversation.name) {
        updateData.name = name;
      }
      if (description !== conversation.description) {
        updateData.description = description;
      }
      if (newAvatarUrl) {
        updateData.avatar_url = newAvatarUrl;
      }

      const response = await api.put(`/conversations/${conversation._id}`, updateData);
      
      if (response.data?.conversation) {
        onConversationUpdated(response.data.conversation);
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating group:', error);
      alert(error?.response?.data?.error || 'Could not update group. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLeaveGroup = async () => {
    if (!onLeaveGroup) return;
    
    // If last admin, must transfer first
    if (isLastAdmin && !selectedNewAdmin) {
      setConfirmAction('transfer');
      return;
    }

    setIsSaving(true);
    try {
      // Transfer admin role if needed
      if (isLastAdmin && selectedNewAdmin) {
        await api.put(
          `/conversations/${conversation._id}/participants/${selectedNewAdmin}/role`,
          { role: 'admin' }
        );
      }
      
      await onLeaveGroup();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error leaving group:', error);
      alert(error?.response?.data?.error || 'Could not leave group. Please try again.');
    } finally {
      setIsSaving(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteGroup = async () => {
    if (!canDelete || !onDeleteGroup) return;
    
    setIsSaving(true);
    try {
      await onDeleteGroup();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      alert(error?.response?.data?.error || 'Could not delete group. Please try again.');
    } finally {
      setIsSaving(false);
      setConfirmAction(null);
    }
  };

  const groupInitial = name ? name[0].toUpperCase() : 'G';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with Avatar */}
        <DialogHeader className="relative p-0">
          <div className="h-24 bg-gradient-to-r from-[#615EF0] to-[#8B5CF6] relative">
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-3 right-3 w-8 h-8 bg-black/20 hover:bg-black/30 rounded-full flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
          
          <div className="relative -mt-12 px-6">
            <div 
              className={cn(
                "relative inline-block",
                canEdit && "cursor-pointer group"
              )}
              onClick={handleAvatarClick}
            >
              <Avatar className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg">
                <AvatarImage src={avatarPreview || conversation.avatar_url} />
                <AvatarFallback className="rounded-2xl bg-[#615EF0] text-white text-2xl font-bold">
                  {groupInitial}
                </AvatarFallback>
              </Avatar>
              {canEdit && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          
          <div className="px-6 pt-3 pb-4">
            <DialogTitle className="text-xl font-bold">{conversation.name || 'Group'}</DialogTitle>
            <p className="text-sm text-gray-500 mt-1">
              <Users className="w-4 h-4 inline mr-1" />
              {conversation.participants?.length || 0} members
            </p>
          </div>
        </DialogHeader>

        {/* Settings Form */}
        <div className="px-6 pb-4 space-y-4 max-h-[400px] overflow-y-auto">
          {/* Group Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Group Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter group name"
              disabled={!canEdit}
              className="focus-visible:ring-[#615EF0]"
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter group description (optional)"
              disabled={!canEdit}
              className="w-full min-h-[80px] px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#615EF0] resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right">{description.length}/500</p>
          </div>



          {/* Leave Group */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200"
              onClick={() => setConfirmAction('leave')}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Leave Group
            </Button>
            {isLastAdmin && (
              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                You are the only admin. Transfer ownership before leaving.
              </p>
            )}
          </div>

          {/* Danger Zone - Delete Group (Admin only) */}
          {canDelete && (
            <div className="pt-4 border-t border-gray-200">
              <p className="text-sm font-medium text-red-600 mb-2">Danger Zone</p>
              <Button
                variant="outline"
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                onClick={() => setConfirmAction('delete')}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Group
              </Button>
            </div>
          )}

          {/* Permission notice for non-admins */}
          {!canEdit && (
            <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Only Admin and Moderator can edit group settings.</span>
            </div>
          )}
        </div>

        {/* Confirmation Overlay */}
        {confirmAction && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              {confirmAction === 'delete' && (
                <>
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">Delete Group?</h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    This action cannot be undone. All messages and group data will be permanently deleted.
                  </p>
                </>
              )}
              
              {confirmAction === 'leave' && !isLastAdmin && (
                <>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">Leave Group?</h3>
                  <p className="text-sm text-gray-600 text-center mb-6">
                    You will no longer receive messages from this group.
                  </p>
                </>
              )}

              {(confirmAction === 'leave' && isLastAdmin) || confirmAction === 'transfer' ? (
                <>
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-6 h-6 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-bold text-center mb-2">Transfer Admin Role</h3>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    You are the only admin. Please select a replacement before leaving.
                  </p>
                  <ScrollArea className="max-h-40 mb-4">
                    <div className="space-y-2">
                      {otherMembers.map((p) => (
                        <button
                          key={p.user_id?._id}
                          onClick={() => setSelectedNewAdmin(p.user_id?._id || null)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all',
                            selectedNewAdmin === p.user_id?._id
                              ? 'border-[#615EF0] bg-[#615EF0]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.user_id?.avatar_url} />
                            <AvatarFallback>
                              {p.user_id?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{p.user_id?.username}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : null}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setConfirmAction(null);
                    setSelectedNewAdmin(null);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  className={cn(
                    'flex-1',
                    confirmAction === 'delete'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  )}
                  onClick={
                    confirmAction === 'delete'
                      ? handleDeleteGroup
                      : handleLeaveGroup
                  }
                  disabled={
                    isSaving ||
                    (isLastAdmin && confirmAction !== 'delete' && !selectedNewAdmin)
                  }
                >
                  {isSaving
                    ? 'Processing...'
                    : confirmAction === 'delete'
                    ? 'Delete Group'
                    : isLastAdmin && selectedNewAdmin
                    ? 'Transfer & Leave'
                    : 'Leave Group'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t p-4 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Close
          </Button>
          {canEdit && (
            <Button
              className="bg-[#615EF0] hover:bg-[#5048D9]"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                'Saving...'
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
