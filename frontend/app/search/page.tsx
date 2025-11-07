'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Users, MessageSquare, FileText, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const debouncedQuery = useDebounce(query, 300);
  const [loading, setLoading] = useState(false);

  // Mock results
  const [results] = useState({
    users: [
      { _id: '1', username: 'nguyenvana', email: 'nguyenvana@example.com', avatar_url: '' },
      { _id: '2', username: 'tranthib', email: 'tranthib@example.com', avatar_url: '' },
    ],
    conversations: [
      { _id: '1', name: 'Nhóm học tập', type: 'group', participants: [], last_message: null },
    ],
    messages: [
      {
        _id: '1',
        content: 'Hello, how are you?',
        sender_id: { _id: '1', username: 'nguyenvana', avatar_url: '' },
        conversation_id: '1',
        created_at: new Date(),
      },
    ],
  });

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setLoading(true);
      // TODO: API call
      setTimeout(() => setLoading(false), 500);
    }
  }, [debouncedQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <X className="h-5 w-5" />
            </Button>

            <div className="flex-1 flex items-center gap-4">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm người dùng, nhóm, tin nhắn..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                  autoFocus
                />
              </div>

              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[180px]">
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
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {query.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mt-20"
          >
            <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Tìm kiếm QuickPing</h2>
            <p className="text-muted-foreground">
              Nhập từ khóa để tìm kiếm người dùng, nhóm hoặc tin nhắn
            </p>
          </motion.div>
        ) : query.length < 2 ? (
          <p className="text-center text-muted-foreground mt-20">
            Nhập ít nhất 2 ký tự để tìm kiếm
          </p>
        ) : loading ? (
          <p className="text-center text-muted-foreground mt-20">
            Đang tìm kiếm...
          </p>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                Tất cả
                <Badge variant="secondary" className="ml-2">
                  {results.users.length + results.conversations.length + results.messages.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                Người dùng
                <Badge variant="secondary" className="ml-2">
                  {results.users.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="conversations">
                <MessageSquare className="h-4 w-4 mr-2" />
                Cuộc trò chuyện
                <Badge variant="secondary" className="ml-2">
                  {results.conversations.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="messages">
                <FileText className="h-4 w-4 mr-2" />
                Tin nhắn
                <Badge variant="secondary" className="ml-2">
                  {results.messages.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            {/* All Results */}
            <TabsContent value="all" className="space-y-6">
              {/* Users Section */}
              {results.users.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Người dùng
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {results.users.map((user) => (
                      <Card key={user._id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
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
                            <Button size="sm">Nhắn tin</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Conversations Section */}
              {results.conversations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Cuộc trò chuyện
                  </h3>
                  <div className="space-y-2">
                    {results.conversations.map((conv) => (
                      <Card key={conv._id} className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {conv.name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">{conv.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {conv.type === 'group' ? 'Nhóm' : 'Trò chuyện trực tiếp'}
                              </p>
                            </div>
                            <Button size="sm">Mở</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <ScrollArea className="h-[600px]">
                <div className="grid gap-3 md:grid-cols-2">
                  {results.users.map((user) => (
                    <motion.div
                      key={user._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
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
                            <Button size="sm">Nhắn tin</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Conversations Tab */}
            <TabsContent value="conversations">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {results.conversations.map((conv) => (
                    <motion.div
                      key={conv._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {conv.name?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">{conv.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {conv.type === 'group' ? 'Nhóm' : 'Trò chuyện trực tiếp'}
                              </p>
                            </div>
                            <Button size="sm">Mở</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Messages Tab */}
            <TabsContent value="messages">
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {results.messages.map((message) => (
                    <motion.div
                      key={message._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Avatar>
                              <AvatarImage src={message.sender_id.avatar_url} />
                              <AvatarFallback>
                                {message.sender_id.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">
                                {message.sender_id.username}
                              </p>
                              <p className="text-sm">{message.content}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(message.created_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                            <Button size="sm">Xem</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

