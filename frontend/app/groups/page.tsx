'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, Settings, MessageCircle, Crown, Search, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Conversation } from '@/types';
import { AddMembersModal } from '@/components/modals/add-members-modal';
import { GroupSettingsModal } from '@/components/modals/group-settings-modal';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';
import { useUser } from '@/hooks/useUser';

export default function GroupsPage() {
  const router = useRouter();
  const { user } = useUser();
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<Conversation | null>(null);
  const [addMembersOpen, setAddMembersOpen] = useState(false);
  const [settingsGroup, setSettingsGroup] = useState<Conversation | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      setLoading(true);
      console.log('📡 Fetching groups...');
      const response = await apiClient.conversations.getAll();
      const allConversations = response.data.conversations || [];
      const groupConversations = allConversations.filter(
        (conv: Conversation) => conv.type === 'group'
      );
      console.log(`✅ Loaded ${groupConversations.length} groups`);
      setGroups(groupConversations);
    } catch (error: any) {
      console.error('❌ Error loading groups:', error);
      if (error.response) {
        console.error('   Response status:', error.response.status);
        console.error('   Response data:', error.response.data);
      } else if (error.request) {
        console.error('   No response received. Is backend running?');
      }
      setGroups([]); // Clear groups on error
    } finally {
      setLoading(false);
    }
  };

  const filteredGroups = groups.filter((group) =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getGroupRole = (group: Conversation) => {
    // Get current user's role in group
    const currentUserId = localStorage.getItem('user') 
      ? JSON.parse(localStorage.getItem('user')!)._id 
      : null;
    const participant = group.participants.find(
      (p) => p.user_id._id === currentUserId
    );
    return participant?.role || 'member';
  };

  const handleAddMembers = (group: Conversation) => {
    setSelectedGroup(group);
    setAddMembersOpen(true);
  };

  const handleMembersAdded = () => {
    // Reload groups after adding members
    loadGroups();
  };

  if (loading) {
    return (
      <PageWrapper>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        icon={Users}
        title="My Groups"
        subtitle={`${groups.length} groups`}
        actions={
          <Button onClick={() => router.push('/groups/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Group
          </Button>
        }
      />

      <PageContainer maxWidth="2xl">
        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{groups.length}</p>
                  <p className="text-sm text-muted-foreground">Total Groups</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <Crown className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {groups.filter((g) => getGroupRole(g) === 'admin').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Groups Managed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <MessageCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {groups.reduce((sum, g) => sum + g.participants.length, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Groups List */}
        {filteredGroups.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">
              {groups.length === 0 ? 'You have no groups yet' : 'No groups found'}
            </p>
            {groups.length === 0 && (
              <p className="text-sm mb-4">Create a group to start chatting with multiple people</p>
            )}
            {groups.length === 0 && (
              <Button onClick={() => router.push('/groups/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Group
              </Button>
            )}
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((group) => {
                const role = getGroupRole(group);
                return (
                  <motion.div
                    key={group._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        {/* Group Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3 flex-1">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={`https://api.dicebear.com/7.x/shapes/svg?seed=${group._id}`} />
                              <AvatarFallback>
                                {group.name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate">{group.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {group.participants.length} members
                              </p>
                            </div>
                          </div>
                          {role === 'admin' && (
                            <Badge variant="secondary" className="ml-2">
                              <Crown className="h-3 w-3 mr-1" />
                              Admin
                            </Badge>
                          )}
                        </div>

                        {/* Group Description */}
                        {group.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {group.description}
                          </p>
                        )}

                        {/* Group Members Preview */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex -space-x-2">
                            {group.participants.slice(0, 5).map((participant, idx) => (
                              <Avatar
                                key={idx}
                                className="h-8 w-8 border-2 border-background"
                              >
                                <AvatarImage src={participant.user_id.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {participant.user_id.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </div>
                          {group.participants.length > 5 && (
                            <span className="text-xs text-muted-foreground">
                              +{group.participants.length - 5} more
                            </span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            className="flex-1"
                            size="sm"
                            onClick={() => router.push(`/?conversation=${group._id}`)}
                          >
                            <MessageCircle className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                          {(role === 'admin' || role === 'moderator') && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddMembers(group);
                                }}
                                title="Add members"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSettingsGroup(group);
                                  setSettingsOpen(true);
                                }}
                                title="Group settings"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </ScrollArea>
        )}

        {/* Add Members Modal */}
        {selectedGroup && (
          <AddMembersModal
            open={addMembersOpen}
            onOpenChange={setAddMembersOpen}
            conversationId={selectedGroup._id}
            currentMembers={selectedGroup.participants.map((p) => p.user_id._id)}
            onMembersAdded={handleMembersAdded}
          />
        )}
        
        {/* Group Settings Modal */}
        {settingsGroup && user && (
          <GroupSettingsModal
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            conversation={settingsGroup}
            currentUserId={user._id}
            currentUserRole={getGroupRole(settingsGroup) as 'admin' | 'moderator' | 'member'}
            onConversationUpdated={(updatedConv) => {
              setGroups(groups.map(g => g._id === updatedConv._id ? updatedConv : g));
              setSettingsGroup(updatedConv);
            }}
            onLeaveGroup={async () => {
              await apiClient.conversations.removeParticipant(settingsGroup._id, user._id);
              setGroups(groups.filter(g => g._id !== settingsGroup._id));
              setSettingsOpen(false);
            }}
            onDeleteGroup={async () => {
              // TODO: Implement delete group endpoint
              setGroups(groups.filter(g => g._id !== settingsGroup._id));
              setSettingsOpen(false);
            }}
          />
        )}
      </PageContainer>
    </PageWrapper>
  );
}

