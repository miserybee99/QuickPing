'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, Trash2, UserPlus, MessageSquare, Users, Loader2, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { PageHeader, PageContainer, PageWrapper } from '@/components/layout';
import { apiClient } from '@/lib/api-client';
import { useNotifications } from '@/contexts/NotificationContext';
import { useRouter } from 'next/navigation';
import { User } from '@/types';

interface FriendRequest {
  _id: string;
  user_id: User;
  friend_id: User;
  status: string;
  sent_at: Date;
}

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
    friendship_id?: string;
  };
}

export default function NotificationsPage() {
  const router = useRouter();
  const { refreshCounts } = useNotifications();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch pending friend requests and convert to notifications
      const requestsRes = await apiClient.friends.getRequests();
      const requests: FriendRequest[] = requestsRes.data.requests || [];
      
      // Convert friend requests to notification format
      const friendRequestNotifications: Notification[] = requests.map((request) => ({
        _id: request._id,
        type: 'friend_request' as const,
        title: 'Friend Request',
        message: `${request.user_id.username} sent you a friend request`,
        is_read: false,
        created_at: new Date(request.sent_at),
        data: {
          user: {
            _id: request.user_id._id,
            username: request.user_id.username,
            avatar_url: request.user_id.avatar_url,
          },
          friendship_id: request._id,
        },
      }));

      setNotifications(friendRequestNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleAcceptFriendRequest = async (notification: Notification) => {
    if (!notification.data?.friendship_id) return;
    
    setActionLoading(notification._id);
    try {
      await apiClient.friends.acceptRequest(notification.data.friendship_id);
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      refreshCounts();
    } catch (error) {
      console.error('Error accepting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFriendRequest = async (notification: Notification) => {
    if (!notification.data?.friendship_id) return;
    
    setActionLoading(notification._id);
    try {
      await apiClient.friends.rejectRequest(notification.data.friendship_id);
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      refreshCounts();
    } catch (error) {
      console.error('Error rejecting friend request:', error);
    } finally {
      setActionLoading(null);
    }
  };

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
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Inbox className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No notifications</p>
                  <p className="text-sm">You're all caught up! Check back later.</p>
                </div>
              ) : (
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
                          {notification.type === 'friend_request' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptFriendRequest(notification)}
                                disabled={actionLoading === notification._id}
                              >
                                {actionLoading === notification._id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectFriendRequest(notification)}
                                disabled={actionLoading === notification._id}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {notification.type !== 'friend_request' && (
                            <>
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
                            </>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="unread">
            <ScrollArea className="h-[700px]">
              {notifications.filter((n) => !n.is_read).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Inbox className="h-16 w-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No unread notifications</p>
                  <p className="text-sm">You've read all your notifications!</p>
                </div>
              ) : (
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
                            {notification.type === 'friend_request' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleAcceptFriendRequest(notification)}
                                  disabled={actionLoading === notification._id}
                                >
                                  {actionLoading === notification._id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRejectFriendRequest(notification)}
                                  disabled={actionLoading === notification._id}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            {notification.type !== 'friend_request' && (
                              <>
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
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PageContainer>
    </PageWrapper>
  );
}
