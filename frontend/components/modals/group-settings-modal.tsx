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
  Loader2,
  Edit3,
  FileText,
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
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types';
import api from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';

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
  const { toast } = useToast();

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

  const canEdit = currentUserRole === 'admin'; // Only admins can edit group info
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
      
      toast({
        title: "Success",
        description: "Group settings updated successfully.",
        variant: "success",
      });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating group:', error);
      toast({
        title: "Update Failed",
        description: error?.response?.data?.error || 'Could not update group. Please try again.',
        variant: "destructive",
      });
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
      toast({
        title: "Leave Failed",
        description: error?.response?.data?.error || 'Could not leave group. Please try again.',
        variant: "destructive",
      });
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
      toast({
        title: "Delete Failed",
        description: error?.response?.data?.error || 'Could not delete group. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setConfirmAction(null);
    }
  };

  const groupInitial = name ? name[0].toUpperCase() : 'G';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden dark:bg-gray-900">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Group Settings
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
          
          {/* Avatar and Basic Info */}
          <div className="flex items-center gap-4">
            <div 
              className={cn(
                "relative",
                canEdit && "cursor-pointer group"
              )}
              onClick={handleAvatarClick}
            >
              <Avatar className="h-16 w-16 rounded-xl border-2 border-gray-200 dark:border-gray-700">
                <AvatarImage src={avatarPreview || conversation.avatar_url} />
                <AvatarFallback className="rounded-xl bg-gradient-to-br from-[#615EF0] to-[#8B5CF6] text-white text-lg font-bold">
                  {groupInitial}
                </AvatarFallback>
              </Avatar>
              {canEdit && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#615EF0] rounded-full border-2 border-white dark:border-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-3 h-3 text-white" />
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
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {conversation.name || 'Group'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
                <Users className="w-3.5 h-3.5" />
                {conversation.participants?.length || 0} members
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Settings Form */}
        <ScrollArea className="max-h-[calc(100vh-300px)]">
          <div className="p-6 space-y-6">
            {/* Group Name */}
            <div className="space-y-2">
              <Label htmlFor="group-name" className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Group Name
              </Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter group name"
                disabled={!canEdit}
                className="h-11 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="group-description" className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                Description
              </Label>
              <Textarea
                id="group-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter group description (optional)"
                disabled={!canEdit}
                className="min-h-[100px] bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 resize-none"
                maxLength={500}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                {description.length}/500
              </p>
            </div>

            {/* Permission notice for non-admins */}
            {!canEdit && (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 p-3 rounded-lg text-sm flex items-center gap-2 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Only admins can edit group settings.</span>
              </div>
            )}

            <Separator className="my-2" />

            {/* Actions */}
            <div className="space-y-3">
              {/* Leave Group */}
              <Button
                variant="outline"
                className="w-full justify-start h-11 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                onClick={() => setConfirmAction('leave')}
                disabled={isSaving}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </Button>
              {isLastAdmin && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 px-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  You are the only admin. Transfer ownership before leaving.
                </p>
              )}

              {/* Delete Group (Admin only) */}
              {canDelete && (
                <Button
                  variant="outline"
                  className="w-full justify-start h-11 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                  onClick={() => setConfirmAction('delete')}
                  disabled={isSaving}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Group
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Confirmation Overlay */}
        {confirmAction && (
          <div className="absolute inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-gray-700">
              {confirmAction === 'delete' && (
                <>
                  <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trash2 className="w-7 h-7 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
                    Delete Group?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                    This action cannot be undone. All messages and group data will be permanently deleted.
                  </p>
                </>
              )}
              
              {confirmAction === 'leave' && !isLastAdmin && (
                <>
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <LogOut className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
                    Leave Group?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                    You will no longer receive messages from this group.
                  </p>
                </>
              )}

              {(confirmAction === 'leave' && isLastAdmin) || confirmAction === 'transfer' ? (
                <>
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Crown className="w-7 h-7 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">
                    Transfer Admin Role
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
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
                              ? 'border-[#615EF0] bg-[#615EF0]/5 dark:bg-[#615EF0]/20 dark:border-[#615EF0]'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.user_id?.avatar_url} />
                            <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                              {p.user_id?.username?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {p.user_id?.username}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : null}

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  className="flex-1 h-11"
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
                    'flex-1 h-11',
                    confirmAction === 'delete'
                      ? 'bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                      : 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
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
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : confirmAction === 'delete' ? (
                    'Delete Group'
                  ) : isLastAdmin && selectedNewAdmin ? (
                    'Transfer & Leave'
                  ) : (
                    'Leave Group'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
            className="h-11"
          >
            Cancel
          </Button>
          {canEdit && (
            <Button
              className="bg-[#615EF0] hover:bg-[#5048D9] dark:bg-[#615EF0] dark:hover:bg-[#5048D9] h-11"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
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
