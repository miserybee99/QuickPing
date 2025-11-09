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
import { Moon, Sun, Type, Bell, Lock, User as UserIcon, X } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  
  // Notification states
  const [notifications, setNotifications] = useState({
    messages: true,
    friendRequests: true,
    groupInvites: true,
    mentions: true,
    sound: true,
  });
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (user?.preferences) {
      setTheme(user.preferences.theme || 'light');
      setFontSize(user.preferences.font_size || 'medium');
    }
  }, [user]);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Apply font size
  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = fontSize === 'small' ? '14px' : fontSize === 'large' ? '18px' : '16px';
  }, [fontSize]);

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      await apiClient.users.updatePreferences({
        theme,
        font_size: fontSize,
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
    <div className="h-full flex flex-col">
      <ScrollArea className="flex-1">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          {/* Header with Close Button */}
          <div className="mb-8 flex items-start justify-between">
            <div className="flex-1">
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-gray-600 mt-2">Quản lý tài khoản và tùy chỉnh trải nghiệm của bạn</p>
            </div>
            
            {/* Close Button - ESC Style */}
            <button
              onClick={() => router.push('/')}
              className="flex flex-col items-center gap-2 group flex-shrink-0"
              aria-label="Close settings"
            >
              <div className="w-12 h-12 rounded-full bg-[#2B2D31] border-2 border-gray-600 flex items-center justify-center hover:border-gray-400 transition-colors">
                <X className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
              </div>
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">ESC</span>
            </button>
          </div>

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
                <Sun className="w-5 h-5" />
                Theme
              </CardTitle>
              <CardDescription>
                Chọn giao diện sáng hoặc tối cho ứng dụng
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Light/Dark Mode */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-blue-500" />
                  ) : (
                    <Sun className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <Label htmlFor="theme-toggle" className="font-medium">
                      Dark Mode
                    </Label>
                    <p className="text-sm text-gray-500">
                      {theme === 'dark' ? 'Đang sử dụng chế độ tối' : 'Đang sử dụng chế độ sáng'}
                    </p>
                  </div>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === 'dark'}
                  onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                />
              </div>
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
                setTheme(user?.preferences?.theme || 'light');
                setFontSize(user?.preferences?.font_size || 'medium');
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Thông báo
              </CardTitle>
              <CardDescription>
                Quản lý các loại thông báo bạn muốn nhận
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-messages" className="font-medium">
                      Tin nhắn mới
                    </Label>
                    <p className="text-sm text-gray-500">
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
                    <p className="text-sm text-gray-500">
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
                    <p className="text-sm text-gray-500">
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
                    <p className="text-sm text-gray-500">
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
                    <p className="text-sm text-gray-500">
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
        </TabsContent>

        {/* ====================================================================== */}
        {/* PRIVACY TAB */}
        {/* ====================================================================== */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Quyền riêng tư
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
                    <div className="flex items-center gap-2">
                      <input type="radio" name="message-privacy" id="msg-everyone" defaultChecked />
                      <label htmlFor="msg-everyone" className="text-sm">
                        Tất cả mọi người
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="message-privacy" id="msg-friends" />
                      <label htmlFor="msg-friends" className="text-sm">
                        Chỉ bạn bè
                      </label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">Ai có thể thêm bạn vào nhóm?</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="radio" name="group-privacy" id="grp-everyone" defaultChecked />
                      <label htmlFor="grp-everyone" className="text-sm">
                        Tất cả mọi người
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="group-privacy" id="grp-friends" />
                      <label htmlFor="grp-friends" className="text-sm">
                        Chỉ bạn bè
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="group-privacy" id="grp-none" />
                      <label htmlFor="grp-none" className="text-sm">
                        Không ai
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
    </div>
  );
}

