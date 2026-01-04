'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  Check,
  X,
  AlertTriangle,
  History,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RoleBadge, RoleType, roleConfig } from '@/components/ui/role-badge';
import { cn } from '@/lib/utils';
import { User } from '@/types';

interface RoleManagementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: User;
  currentRole: RoleType;
  currentUserRole: RoleType;
  onRoleChange: (newRole: RoleType) => Promise<void>;
  onRemoveMember: () => Promise<void>;
}

// Permission matrix for each role
const permissionMatrix = {
  admin: {
    canManageMembers: true,
    canChangeRoles: true,
    canRemoveMembers: true,
    canEditGroupInfo: true,
    canPinMessages: true,
    canInviteMembers: true,
  },
  moderator: {
    canManageMembers: false,
    canChangeRoles: false,
    canRemoveMembers: true,
    canEditGroupInfo: false,
    canPinMessages: true,
    canInviteMembers: true,
  },
  member: {
    canManageMembers: false,
    canChangeRoles: false,
    canRemoveMembers: false,
    canEditGroupInfo: false,
    canPinMessages: false,
    canInviteMembers: false,
  },
};

const permissionLabels: Record<string, string> = {
  canManageMembers: 'Manage Members',
  canChangeRoles: 'Change Roles',
  canRemoveMembers: 'Remove Members',
  canEditGroupInfo: 'Edit Group Info',
  canPinMessages: 'Pin Messages',
  canInviteMembers: 'Invite Members',
};

export function RoleManagementModal({
  open,
  onOpenChange,
  member,
  currentRole,
  currentUserRole,
  onRoleChange,
  onRemoveMember,
}: RoleManagementModalProps) {
  const [selectedRole, setSelectedRole] = useState<RoleType>(currentRole);
  const [isChanging, setIsChanging] = useState(false);
  const [activeTab, setActiveTab] = useState<'role' | 'permissions' | 'activity'>('role');
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'role' | 'remove' | null>(null);

  useEffect(() => {
    setSelectedRole(currentRole);
  }, [currentRole, open]);

  const handleRoleChange = async () => {
    if (selectedRole === currentRole) return;
    
    setIsChanging(true);
    try {
      await onRoleChange(selectedRole);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsChanging(false);
      setShowConfirm(false);
      setConfirmAction(null);
    }
  };

  const handleRemove = async () => {
    setIsChanging(true);
    try {
      await onRemoveMember();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsChanging(false);
      setShowConfirm(false);
      setConfirmAction(null);
    }
  };

  const canChangeRole = currentUserRole === 'admin';
  const canRemoveMember = currentUserRole === 'admin' || currentUserRole === 'moderator';
  const isRoleChanged = selectedRole !== currentRole;

  const roles: RoleType[] = ['admin', 'moderator', 'member'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Header with member info */}
        <DialogHeader className="p-6 pb-4 bg-gradient-to-r from-[#615EF0]/5 to-[#615EF0]/10">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-2xl border-2 border-white shadow-lg">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback className="rounded-2xl bg-gray-200 text-xl">
                {member.username[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold">{member.username}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <RoleBadge role={currentRole} size="sm" />
                {member.mssv && (
                  <span className="text-xs text-gray-500">• {member.mssv}</span>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'role'
                ? 'text-[#615EF0]'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('role')}
          >
            <Settings className="w-4 h-4 inline-block mr-1.5" />
            Role
            {activeTab === 'role' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#615EF0]" />
            )}
          </button>
          <button
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'permissions'
                ? 'text-[#615EF0]'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('permissions')}
          >
            <Shield className="w-4 h-4 inline-block mr-1.5" />
            Permissions
            {activeTab === 'permissions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#615EF0]" />
            )}
          </button>
          <button
            className={cn(
              'flex-1 py-3 text-sm font-medium transition-colors relative',
              activeTab === 'activity'
                ? 'text-[#615EF0]'
                : 'text-gray-500 hover:text-gray-700'
            )}
            onClick={() => setActiveTab('activity')}
          >
            <History className="w-4 h-4 inline-block mr-1.5" />
            Activity
            {activeTab === 'activity' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#615EF0]" />
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Role Tab */}
          {activeTab === 'role' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Select a role for this member. Different roles have different permissions.
              </p>

              {roles.map((role) => {
                const config = roleConfig[role];
                const Icon = config.icon;
                const isSelected = selectedRole === role;
                const isCurrent = currentRole === role;

                return (
                  <button
                    key={role}
                    onClick={() => canChangeRole && setSelectedRole(role)}
                    disabled={!canChangeRole}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all',
                      isSelected
                        ? 'border-[#615EF0] bg-[#615EF0]/5'
                        : 'border-gray-200 hover:border-gray-300',
                      !canChangeRole && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('w-6 h-6', config.iconColor)} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{config.label}</span>
                        {isCurrent && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {role === 'admin' && 'Full control over the group'}
                        {role === 'moderator' && 'Can moderate content and members'}
                        {role === 'member' && 'Basic group participation'}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-[#615EF0] flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </button>
                );
              })}

              {!canChangeRole && (
                <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Only admins can change member roles.
                </p>
              )}
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Permissions for <RoleBadge role={selectedRole} size="sm" />
              </p>

              <div className="space-y-2">
                {Object.entries(permissionLabels).map(([key, label]) => {
                  const hasPermission = permissionMatrix[selectedRole][key as keyof typeof permissionMatrix.admin];
                  return (
                    <div
                      key={key}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        hasPermission ? 'bg-green-50' : 'bg-gray-50'
                      )}
                    >
                      <span className="text-sm">{label}</span>
                      {hasPermission ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <X className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 text-center py-8">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                Activity log coming soon...
                <br />
                <span className="text-xs">Role changes will be tracked here</span>
              </p>
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {showConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-10">
            <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-center mb-2">
                {confirmAction === 'remove' ? 'Remove Member?' : 'Change Role?'}
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                {confirmAction === 'remove'
                  ? `Are you sure you want to remove ${member.username} from this group?`
                  : `Change ${member.username}'s role from ${currentRole} to ${selectedRole}?`}
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmAction(null);
                  }}
                  disabled={isChanging}
                >
                  Cancel
                </Button>
                <Button
                  className={cn(
                    'flex-1',
                    confirmAction === 'remove'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#615EF0] hover:bg-[#5048D9]'
                  )}
                  onClick={confirmAction === 'remove' ? handleRemove : handleRoleChange}
                  disabled={isChanging}
                >
                  {isChanging ? 'Processing...' : 'Confirm'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="border-t p-4 flex gap-3">
          {canRemoveMember && currentRole !== 'admin' && (
            <Button
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => {
                setConfirmAction('remove');
                setShowConfirm(true);
              }}
              disabled={isChanging}
            >
              Remove
            </Button>
          )}
          <div className="flex-1" />
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isChanging}
          >
            Cancel
          </Button>
          {canChangeRole && isRoleChanged && (
            <Button
              className="bg-[#615EF0] hover:bg-[#5048D9]"
              onClick={() => {
                setConfirmAction('role');
                setShowConfirm(true);
              }}
              disabled={isChanging}
            >
              Save Changes
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
