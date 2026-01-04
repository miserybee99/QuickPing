'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Search, Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { getFileUrl } from '@/lib/file-utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

interface AddMembersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentMembers: string[]; // Array of user IDs already in group
  onMembersAdded: () => void;
}

export function AddMembersModal({
  open,
  onOpenChange,
  conversationId,
  currentMembers,
  onMembersAdded,
}: AddMembersModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (open) {
      loadFriends();
      setSelectedUsers([]);
      setSearchQuery('');
    }
  }, [open]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      const response = await apiClient.friends.getAll();
      const allFriends = response.data.friends || [];
      
      // Filter out users already in the group
      const availableFriends = allFriends.filter(
        (friend: User) => !currentMembers.includes(friend._id)
      );
      
      setFriends(availableFriends);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMembers = async () => {
    if (selectedUsers.length === 0) return;

    try {
      setAdding(true);
      
      // Get current conversation data
      const convResponse = await apiClient.conversations.getById(conversationId);
      const conversation = convResponse.data.conversation;
      
      // Add new members to existing participants
      const updatedParticipants = [
        ...conversation.participants.map((p: any) => ({
          user_id: p.user_id._id || p.user_id,
          role: p.role,
        })),
        ...selectedUsers.map((userId) => ({
          user_id: userId,
          role: 'member',
        })),
      ];

      // Update conversation with new participants
      const updateResponse = await apiClient.conversations.update(conversationId, {
        participants: updatedParticipants,
      });

      // Use the response from API to update UI immediately (don't wait for socket event)
      const updatedConversation = updateResponse.data?.conversation || updateResponse.data;
      
      if (updatedConversation) {
        console.log('✅ Members added successfully, updating UI immediately');
        // Notify parent component with updated conversation
        onMembersAdded();
      }

      onOpenChange(false);
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Could not add members. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Members
          </DialogTitle>
          <DialogDescription>
            Select friends to add to the group
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search friends..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Selected count */}
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedUsers.length} selected
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedUsers([])}
              >
                <X className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          )}

          {/* Friends list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredFriends.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {friends.length === 0
                  ? 'All friends are already in the group'
                  : 'No results found'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-2">
                {filteredFriends.map((friend) => (
                  <div
                    key={friend._id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => toggleUser(friend._id)}
                  >
                    <Checkbox
                      checked={selectedUsers.includes(friend._id)}
                      onCheckedChange={() => toggleUser(friend._id)}
                    />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={getFileUrl(friend.avatar_url)} />
                      <AvatarFallback>
                        {friend.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">
                        {friend.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {friend.email}
                      </p>
                    </div>
                    {friend.is_online && (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMembers}
            disabled={selectedUsers.length === 0 || adding}
          >
            {adding ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Add {selectedUsers.length > 0 && `(${selectedUsers.length})`}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
