'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Moon, Sun, Type, Bell, Lock, User as UserIcon, X, Monitor, BellRing, BellOff, Settings } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader } from '@/components/layout';
import { PageWrapper } from '@/components/layout';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  const { theme, setTheme, fontSize, setFontSize, resolvedTheme } = useTheme();
  
  // Notification states
  const [notifications, setNotifications] = useState({
    messages: true,
    friendRequests: true,
    groupInvites: true,
    mentions: true,
    sound: true,
    desktop: false,
    doNotDisturb: false,
  });
  
  // Privacy states
  const [privacy, setPrivacy] = useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    messagePrivacy: 'everyone' as 'everyone' | 'friends',
    groupPrivacy: 'everyone' as 'everyone' | 'friends' | 'none',
  });
  
  // Desktop notification permission state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load user preferences from backend
  useEffect(() => {
    if (user?.preferences) {
      // Theme and fontSize are now managed by ThemeContext
      // Load notification and privacy preferences
      if (user.preferences.notifications) {
        setNotifications(prev => ({
          ...prev,
          ...user.preferences.notifications,
        }));
      }
      if (user.preferences.privacy) {
        setPrivacy(prev => ({
          ...prev,
          ...user.preferences.privacy,
        }));
      }
    }
  }, [user]);

  // Request desktop notification permission
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        setNotifications(prev => ({ ...prev, desktop: true }));
        // Show a test notification
        new Notification('QuickPing', {
          body: 'Thông báo đã được bật thành công!',
          icon: '/logo.png',
        });
      }
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await apiClient.users.updatePreferences({
        theme,
        font_size: fontSize,
        notifications,
        privacy,
      });
      
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Không thể lưu settings. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/login');
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        icon={Settings}
        title="Cài đặt"
        subtitle="Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn"
        actions={
          <button
            onClick={() => router.push('/')}
            className="flex flex-col items-center gap-1.5 group"
            aria-label="Close settings"
          >
            <div className="w-10 h-10 rounded-full bg-muted border-2 border-border flex items-center justify-center hover:border-muted-foreground transition-colors">
              <X className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">ESC</span>
          </button>
        }
      />

      <ScrollArea className="flex-1">
        <div className="container max-w-4xl mx-auto py-6 px-4 sm:px-6">
          <Tabs defaultValue="appearance" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="appearance">Giao diện</TabsTrigger>
          <TabsTrigger value="notifications">Thông báo</TabsTrigger>
          <TabsTrigger value="privacy">Quyền riêng tư</TabsTrigger>
          <TabsTrigger value="account">Tài khoản</TabsTrigger>
        </TabsList>

        {/* ====================================================================== */}
        {/* APPEARANCE TAB */}
        {/* ====================================================================== */}
        <TabsContent value="appearance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {resolvedTheme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                Theme
              </CardTitle>
              <CardDescription>
                Chọn giao diện sáng, tối hoặc theo hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme Options */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    theme === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setTheme('light')}
                >
                  <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : ''}`}>Sáng</span>
                </div>
                
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    theme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setTheme('dark')}
                >
                  <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : ''}`}>Tối</span>
                </div>
                
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    theme === 'system'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setTheme('system')}
                >
                  <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : ''}`}>Hệ thống</span>
                </div>
              </div>
              
              {theme === 'system' && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Giao diện sẽ tự động thay đổi theo cài đặt hệ thống của bạn.
                  Hiện tại đang sử dụng chế độ {resolvedTheme === 'dark' ? 'tối' : 'sáng'}.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="w-5 h-5" />
                Font Size
              </CardTitle>
              <CardDescription>
                Điều chỉnh kích thước chữ trong ứng dụng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Font Size Options */}
              <div className="space-y-3">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    fontSize === 'small'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFontSize('small')}
                >
                  <span className="text-sm">Nhỏ (14px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    fontSize === 'small' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}></div>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    fontSize === 'medium'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFontSize('medium')}
                >
                  <span className="text-base">Trung bình (16px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    fontSize === 'medium' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}></div>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    fontSize === 'large'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setFontSize('large')}
                >
                  <span className="text-lg">Lớn (18px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    fontSize === 'large' ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                  }`}></div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-gray-500 mb-2">Preview:</p>
                <p className="font-medium">
                  The quick brown fox jumps over the lazy dog
                </p>
                <p className="text-gray-600">
                  Đây là đoạn text mẫu để xem preview font size
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setTheme('system');
                setFontSize('medium');
              }}
            >
              Reset
            </Button>
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Đang lưu...' : saveSuccess ? '✓ Đã lưu' : 'Lưu thay đổi'}
            </Button>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* NOTIFICATIONS TAB */}
        {/* ====================================================================== */}
        <TabsContent value="notifications" className="space-y-4">
          {/* Desktop Notifications Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5" />
                Thông báo Desktop
              </CardTitle>
              <CardDescription>
                Nhận thông báo ngay cả khi không mở ứng dụng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationPermission === 'granted' ? (
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">Thông báo đã được bật</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Bạn sẽ nhận được thông báo từ QuickPing</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifications.desktop}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, desktop: checked })
                    }
                  />
                </div>
              ) : notificationPermission === 'denied' ? (
                <div className="p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                      <BellOff className="w-5 h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">Thông báo đã bị chặn</p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Vui lòng bật thông báo trong cài đặt trình duyệt của bạn
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Bật thông báo Desktop</p>
                        <p className="text-sm text-muted-foreground">
                          Nhận thông báo ngay cả khi không mở tab QuickPing
                        </p>
                      </div>
                    </div>
                    <Button onClick={requestNotificationPermission}>
                      Bật ngay
                    </Button>
                  </div>
                </div>
              )}

              {/* Do Not Disturb */}
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BellOff className={`w-5 h-5 ${notifications.doNotDisturb ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <div>
                    <Label htmlFor="dnd-toggle" className="font-medium">
                      Không làm phiền
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Tắt tất cả thông báo tạm thời
                    </p>
                  </div>
                </div>
                <Switch
                  id="dnd-toggle"
                  checked={notifications.doNotDisturb}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, doNotDisturb: checked })
                  }
                />
              </div>
              {notifications.doNotDisturb && (
                <p className="text-sm text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950 p-3 rounded-lg">
                  🔕 Chế độ không làm phiền đang bật. Bạn sẽ không nhận được bất kỳ thông báo nào.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notification Types Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Loại thông báo
              </CardTitle>
              <CardDescription>
                Chọn các loại thông báo bạn muốn nhận
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-messages" className="font-medium">
                      Tin nhắn mới
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi có tin nhắn mới
                    </p>
                  </div>
                  <Switch
                    id="notif-messages"
                    checked={notifications.messages}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, messages: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-friends" className="font-medium">
                      Lời mời kết bạn
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi có lời mời kết bạn
                    </p>
                  </div>
                  <Switch
                    id="notif-friends"
                    checked={notifications.friendRequests}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, friendRequests: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-groups" className="font-medium">
                      Lời mời vào nhóm
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi được mời vào nhóm
                    </p>
                  </div>
                  <Switch
                    id="notif-groups"
                    checked={notifications.groupInvites}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, groupInvites: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-mentions" className="font-medium">
                      Được nhắc đến
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Nhận thông báo khi ai đó nhắc đến bạn
                    </p>
                  </div>
                  <Switch
                    id="notif-mentions"
                    checked={notifications.mentions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, mentions: checked })
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-sound" className="font-medium">
                      Âm thanh thông báo
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Phát âm thanh khi có thông báo mới
                    </p>
                  </div>
                  <Switch
                    id="notif-sound"
                    checked={notifications.sound}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, sound: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Đang lưu...' : saveSuccess ? '✓ Đã lưu' : 'Lưu thay đổi'}
            </Button>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* PRIVACY TAB */}
        {/* ====================================================================== */}
        <TabsContent value="privacy" className="space-y-4">
          {/* Status Privacy Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Trạng thái hoạt động
              </CardTitle>
              <CardDescription>
                Kiểm soát ai có thể thấy trạng thái của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="online-status" className="font-medium">
                    Hiển thị trạng thái online
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép người khác thấy khi bạn đang online
                  </p>
                </div>
                <Switch
                  id="online-status"
                  checked={privacy.showOnlineStatus}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, showOnlineStatus: checked })
                  }
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="read-receipts" className="font-medium">
                    Xác nhận đã đọc
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Cho phép người khác thấy khi bạn đã đọc tin nhắn
                  </p>
                </div>
                <Switch
                  id="read-receipts"
                  checked={privacy.showReadReceipts}
                  onCheckedChange={(checked) =>
                    setPrivacy({ ...privacy, showReadReceipts: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Privacy Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Quyền liên hệ
              </CardTitle>
              <CardDescription>
                Kiểm soát ai có thể liên hệ với bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Ai có thể nhắn tin cho bạn?</Label>
                  <div className="mt-2 space-y-2">
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        privacy.messagePrivacy === 'everyone'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setPrivacy({ ...privacy, messagePrivacy: 'everyone' })}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        privacy.messagePrivacy === 'everyone' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {privacy.messagePrivacy === 'everyone' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">Tất cả mọi người</span>
                    </div>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        privacy.messagePrivacy === 'friends'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setPrivacy({ ...privacy, messagePrivacy: 'friends' })}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        privacy.messagePrivacy === 'friends' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {privacy.messagePrivacy === 'friends' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">Chỉ bạn bè</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">Ai có thể thêm bạn vào nhóm?</Label>
                  <div className="mt-2 space-y-2">
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        privacy.groupPrivacy === 'everyone'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setPrivacy({ ...privacy, groupPrivacy: 'everyone' })}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        privacy.groupPrivacy === 'everyone' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {privacy.groupPrivacy === 'everyone' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">Tất cả mọi người</span>
                    </div>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        privacy.groupPrivacy === 'friends'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setPrivacy({ ...privacy, groupPrivacy: 'friends' })}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        privacy.groupPrivacy === 'friends' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {privacy.groupPrivacy === 'friends' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">Chỉ bạn bè</span>
                    </div>
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        privacy.groupPrivacy === 'none'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setPrivacy({ ...privacy, groupPrivacy: 'none' })}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        privacy.groupPrivacy === 'none' ? 'border-primary bg-primary' : 'border-muted-foreground'
                      }`}>
                        {privacy.groupPrivacy === 'none' && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span className="text-sm">Không ai</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Đang lưu...' : saveSuccess ? '✓ Đã lưu' : 'Lưu thay đổi'}
            </Button>
          </div>
        </TabsContent>

        {/* ====================================================================== */}
        {/* ACCOUNT TAB */}
        {/* ====================================================================== */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Tài khoản
              </CardTitle>
              <CardDescription>
                Quản lý tài khoản của bạn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Email</Label>
                  <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">Username</Label>
                  <p className="text-sm text-gray-600 mt-1">{user?.username}</p>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">MSSV</Label>
                  <p className="text-sm text-gray-600 mt-1">{user?.mssv || 'Chưa cập nhật'}</p>
                </div>

                <Separator />

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/profile')}
                  >
                    Chỉnh sửa thông tin
                  </Button>
                </div>

                <Separator />

                <div className="pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    Đăng xuất
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Xóa tài khoản
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </div>
      </ScrollArea>
    </PageWrapper>
  );
}

