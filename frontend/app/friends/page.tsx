'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserCheck, UserPlus, UserMinus, Check, X, Search, UserX, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';

interface FriendRequest {
  _id: string;
  user_id: User;
  friend_id: User;
  status: string;
  sent_at: Date;
}

export default function FriendsPage() {
  const router = useRouter();
  const { isUserOnline } = useUserStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [blocked, setBlocked] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Get accepted friends
      const friendsRes = await apiClient.friends.getAll();
      setFriends(friendsRes.data.friends || []);
      
      // Get pending incoming requests (people who sent requests to you)
      const requestsRes = await apiClient.friends.getRequests();
      setRequests(requestsRes.data.requests || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await apiClient.friends.acceptRequest(friendshipId);
      await loadData(); // Reload
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      await apiClient.friends.rejectRequest(friendshipId);
      setRequests(requests.filter((r) => r._id !== friendshipId));
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveFriend = async (userId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bạn bè này?')) return;
    
    setActionLoading(userId);
    try {
    setFriends(friends.filter((f) => f._id !== userId));
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(userId);
    try {
    setBlocked(blocked.filter((b) => b._id !== userId));
    } catch (error) {
      console.error('Error unblocking user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        icon={UserCheck}
        title="Bạn bè"
        subtitle={`${friends.length} bạn bè • ${requests.length} lời mời đang chờ`}
        showBackButton
        actions={
          <Button onClick={() => router.push('/search')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Thêm bạn bè
          </Button>
        }
      />

      <PageContainer maxWidth="2xl">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]">
            <TabsTrigger value="all">
              Tất cả
              <Badge variant="secondary" className="ml-2">
                {friends.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending">
              Chờ duyệt
              <Badge variant="secondary" className="ml-2">
                {requests.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="blocked">
              Đã chặn
              <Badge variant="secondary" className="ml-2">
                {blocked.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* All Friends */}
          <TabsContent value="all" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm bạn bè..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredFriends.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">
                  {friends.length === 0 ? 'Chưa có bạn bè nào' : 'Không tìm thấy kết quả'}
                </p>
                {friends.length === 0 && (
                  <Button variant="outline" onClick={() => router.push('/search')}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Tìm bạn bè
                  </Button>
                )}
              </div>
            ) : (
            <ScrollArea className="h-[600px]">
              <div className="grid gap-4 md:grid-cols-2">
                {filteredFriends.map((friend) => (
                  <motion.div
                    key={friend._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={friend.avatar_url} />
                        <AvatarFallback>
                          {friend.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {isUserOnline(friend._id) && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{friend.username}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {friend.email}
                      </p>
                      {isUserOnline(friend._id) ? (
                        <p className="text-xs text-green-600 mt-1">● Online</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">Offline</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => router.push(`/chat?user=${friend._id}`)}
                      >
                        Nhắn tin
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
            )}
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {requests.length} lời mời kết bạn đang chờ
            </p>

            {requests.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có lời mời kết bạn nào</p>
              </div>
            ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {requests.map((request) => (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Avatar className="h-12 w-12">
                      <AvatarImage src={request.user_id.avatar_url} />
                    <AvatarFallback>
                        {request.user_id.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{request.user_id.username}</p>
                    <p className="text-sm text-muted-foreground truncate">
                        {request.user_id.email}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request._id)}
                        disabled={actionLoading === request._id}
                    >
                        {actionLoading === request._id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                      <Check className="h-4 w-4" />
                        )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectRequest(request._id)}
                        disabled={actionLoading === request._id}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </TabsContent>

          {/* Blocked Users */}
          <TabsContent value="blocked" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {blocked.length} người dùng bị chặn
            </p>

            {blocked.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <UserX className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Không có người dùng nào bị chặn</p>
              </div>
            ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {blocked.map((user) => (
                <motion.div
                  key={user._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.username}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnblock(user._id)}
                    disabled={actionLoading === user._id}
                  >
                    {actionLoading === user._id ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                    <UserX className="h-4 w-4 mr-2" />
                    )}
                    Bỏ chặn
                  </Button>
                </motion.div>
              ))}
            </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PageWrapper>
  );
}

