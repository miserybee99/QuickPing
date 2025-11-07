'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, UserPlus, MessageSquare, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import vi from 'date-fns/locale/vi';

interface Notification {
  _id: string;
  type: 'friend_request' | 'message' | 'group_invite' | 'mention';
  title: string;
  message: string;
  is_read: boolean;
  created_at: Date;
  data?: {
    user?: { _id: string; username: string; avatar_url?: string };
    conversation_id?: string;
  };
}

// Mock data
const mockNotifications: Notification[] = [
  {
    _id: '1',
    type: 'friend_request',
    title: 'Lời mời kết bạn',
    message: 'nguyenvana đã gửi lời mời kết bạn',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5),
    data: { user: { _id: '1', username: 'nguyenvana', avatar_url: '' } },
  },
  {
    _id: '2',
    type: 'message',
    title: 'Tin nhắn mới',
    message: 'tranthib đã gửi tin nhắn cho bạn',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30),
    data: { user: { _id: '2', username: 'tranthib', avatar_url: '' }, conversation_id: 'conv1' },
  },
  {
    _id: '3',
    type: 'group_invite',
    title: 'Lời mời vào nhóm',
    message: 'Bạn đã được mời vào nhóm "Nhóm học tập"',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, is_read: true } : n))
    );
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return UserPlus;
      case 'message':
        return MessageSquare;
      case 'group_invite':
        return Users;
      case 'mention':
        return Bell;
      default:
        return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'text-blue-500';
      case 'message':
        return 'text-green-500';
      case 'group_invite':
        return 'text-purple-500';
      case 'mention':
        return 'text-orange-500';
      default:
        return 'text-gray-500';
    }
  };

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
                <Bell className="h-6 w-6" />
                Thông báo
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount}</Badge>
                )}
              </h1>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" onClick={handleMarkAllAsRead}>
                <Check className="h-4 w-4 mr-2" />
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              Tất cả
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Chưa đọc
              <Badge variant="secondary" className="ml-2">
                {unreadCount}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <ScrollArea className="h-[700px]">
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = getIcon(notification.type);
                  const iconColor = getIconColor(notification.type);

                  return (
                    <motion.div
                      key={notification._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                        !notification.is_read ? 'bg-primary/5 border-primary/20' : ''
                      }`}
                    >
                      <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>

                      {notification.data?.user && (
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={notification.data.user.avatar_url} />
                          <AvatarFallback>
                            {notification.data.user.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">{notification.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDistanceToNow(notification.created_at, {
                                addSuffix: true,
                                locale: vi,
                              })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Badge variant="destructive" className="ml-2">
                              Mới
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-1">
                        {!notification.is_read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification._id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(notification._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread">
            <ScrollArea className="h-[700px]">
              <div className="space-y-2">
                {notifications
                  .filter((n) => !n.is_read)
                  .map((notification) => {
                    const Icon = getIcon(notification.type);
                    const iconColor = getIconColor(notification.type);

                    return (
                      <motion.div
                        key={notification._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-4 p-4 border border-primary/20 rounded-lg bg-primary/5 hover:bg-accent/50 transition-colors"
                      >
                        <div className={`p-2 rounded-full bg-muted ${iconColor}`}>
                          <Icon className="h-5 w-5" />
                        </div>

                        {notification.data?.user && (
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={notification.data.user.avatar_url} />
                            <AvatarFallback>
                              {notification.data.user.username?.[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold">{notification.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(notification.created_at, {
                              addSuffix: true,
                              locale: vi,
                            })}
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleMarkAsRead(notification._id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(notification._id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

