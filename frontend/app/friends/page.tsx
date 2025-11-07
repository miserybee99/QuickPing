'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, UserPlus, UserMinus, Check, X, Search, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';

// Mock data
const mockFriends = [
  { _id: '1', username: 'nguyenvana', email: 'nguyenvana@example.com', avatar_url: '', is_online: true },
  { _id: '2', username: 'tranthib', email: 'tranthib@example.com', avatar_url: '', is_online: false },
];

const mockRequests = [
  { _id: '1', username: 'phamvanc', email: 'phamvanc@example.com', avatar_url: '', sent_at: new Date() },
];

const mockBlocked = [
  { _id: '1', username: 'blockeduser', email: 'blocked@example.com', avatar_url: '' },
];

export default function FriendsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState(mockFriends);
  const [requests, setRequests] = useState(mockRequests);
  const [blocked, setBlocked] = useState(mockBlocked);

  const handleAcceptRequest = (userId: string) => {
    // TODO: API call
    console.log('Accept request:', userId);
    setRequests(requests.filter((r) => r._id !== userId));
  };

  const handleRejectRequest = (userId: string) => {
    // TODO: API call
    console.log('Reject request:', userId);
    setRequests(requests.filter((r) => r._id !== userId));
  };

  const handleRemoveFriend = (userId: string) => {
    // TODO: API call
    setFriends(friends.filter((f) => f._id !== userId));
  };

  const handleUnblock = (userId: string) => {
    // TODO: API call
    setBlocked(blocked.filter((b) => b._id !== userId));
  };

  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
              >
                <X className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Users className="h-6 w-6" />
                Bạn bè
              </h1>
            </div>
            <Button onClick={() => router.push('/search')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Thêm bạn bè
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
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
                      {friend.is_online && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{friend.username}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {friend.email}
                      </p>
                      {friend.is_online ? (
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
          </TabsContent>

          {/* Pending Requests */}
          <TabsContent value="pending" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {requests.length} lời mời kết bạn đang chờ
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {requests.map((request) => (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={request.avatar_url} />
                    <AvatarFallback>
                      {request.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{request.username}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {request.email}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request._id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectRequest(request._id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          {/* Blocked Users */}
          <TabsContent value="blocked" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {blocked.length} người dùng bị chặn
            </p>

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
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Bỏ chặn
                  </Button>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

