'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, UserPlus, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';

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
    title: 'Friend Request',
    message: 'nguyenvana sent you a friend request',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5),
    data: { user: { _id: '1', username: 'nguyenvana', avatar_url: '' } },
  },
  {
    _id: '2',
    type: 'message',
    title: 'New Message',
    message: 'tranthib sent you a message',
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30),
    data: { user: { _id: '2', username: 'tranthib', avatar_url: '' }, conversation_id: 'conv1' },
  },
  {
    _id: '3',
    type: 'group_invite',
    title: 'Group Invite',
    message: 'You have been invited to join "Study Group"',
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
];

export default function NotificationsPage() {
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
    <PageWrapper>
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
        showBackButton
        actions={
          unreadCount > 0 ? (
            <Button variant="outline" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          ) : null
        }
      />

      <PageContainer maxWidth="2xl">
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-2">
                {notifications.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="unread">
              Unread
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
                                locale: enUS,
                              })}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <Badge variant="destructive" className="ml-2">
                              New
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
                              locale: enUS,
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
      </PageContainer>
    </PageWrapper>
  );
}

