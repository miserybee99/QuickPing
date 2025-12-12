'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, Filter, UserPlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/hooks/useDebounce';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';
import { useUserStatus } from '@/contexts/UserStatusContext';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';

export default function SearchPage() {
  const router = useRouter();
  const { isUserOnline } = useUserStatus();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const debouncedQuery = useDebounce(query, 300);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [addingFriend, setAddingFriend] = useState<string | null>(null);
  const [friendRequests, setFriendRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [debouncedQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.users.search(debouncedQuery);
      setSearchResults(response.data.users || []);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      setAddingFriend(userId);
      await apiClient.friends.sendRequest(userId);
      setFriendRequests((prev) => new Set(prev).add(userId));
      alert('Đã gửi lời mời kết bạn!');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      const errorMessage = error?.response?.data?.error || 'Không thể gửi lời mời kết bạn';
      alert(errorMessage);
    } finally {
      setAddingFriend(null);
    }
  };

  const handleMessage = async (userId: string) => {
    try {
      const response = await apiClient.conversations.createDirect(userId);
      const conversation = response.data.conversation;
      router.push(`/?conversation=${conversation._id}`);
    } catch (error) {
      console.error('Error creating conversation:', error);
      alert('Không thể tạo cuộc trò chuyện');
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        icon={Search}
        title="Tìm kiếm"
        subtitle="Tìm người dùng theo username, email hoặc MSSV"
        showBackButton
        actions={
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="users">Người dùng</SelectItem>
                <SelectItem value="groups">Nhóm</SelectItem>
                <SelectItem value="messages">Tin nhắn</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <PageContainer maxWidth="2xl">
        {query.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-20"
          >
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Tìm kiếm QuickPing</h2>
            <p className="text-muted-foreground">
              Nhập từ khóa để tìm kiếm người dùng theo username, email, MSSV
            </p>
          </motion.div>
        ) : query.length < 2 ? (
          <p className="text-center text-muted-foreground mt-20">
            Nhập ít nhất 2 ký tự để tìm kiếm
          </p>
        ) : loading ? (
          <div className="text-center mt-20">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Đang tìm kiếm...</p>
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center mt-20 text-muted-foreground">
            <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Không tìm thấy kết quả</p>
            <p className="text-sm">Thử tìm kiếm với từ khóa khác</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5" />
                Kết quả tìm kiếm
                <Badge variant="secondary">{searchResults.length}</Badge>
              </h3>
              <ScrollArea className="h-[600px]">
                <div className="grid gap-3 md:grid-cols-2 pr-4">
                  {searchResults.map((user) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:bg-accent/50 transition-colors">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>
                                  {user.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {isUserOnline(user._id) && (
                                <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold truncate">{user.username}</p>
                              <p className="text-sm text-muted-foreground truncate">
                                {user.email}
                              </p>
                              {user.mssv && (
                                <p className="text-xs text-muted-foreground">
                                  MSSV: {user.mssv}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              {friendRequests.has(user._id) ? (
                                <Badge variant="secondary">Đã gửi lời mời</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddFriend(user._id)}
                                  disabled={addingFriend === user._id}
                                >
                                  {addingFriend === user._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <UserPlus className="h-4 w-4 mr-1" />
                                      Kết bạn
                                    </>
                                  )}
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleMessage(user._id)}
                              >
                                Nhắn tin
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </PageContainer>
    </PageWrapper>
  );
}

