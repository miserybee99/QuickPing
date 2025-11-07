'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User, Mail, Shield, Bell, Palette, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUser();
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    username: user?.username || '',
    email: user?.email || '',
    bio: user?.bio || '',
    avatar_url: user?.avatar_url || '',
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    showOnlineStatus: true,
    showReadReceipts: true,
    allowMessageRequests: true,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    messageNotifications: true,
    friendRequests: true,
    groupInvites: true,
    mentions: true,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    darkMode: false,
    fontSize: 16,
    messageSpacing: 2,
  });

  const handleSaveProfile = async () => {
    setSaving(true);
    // TODO: API call to update profile
    setTimeout(() => {
      setSaving(false);
    }, 1000);
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
              <h1 className="text-2xl font-bold">Cài đặt</h1>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Hồ sơ</span>
            </TabsTrigger>
            <TabsTrigger value="privacy">
              <Shield className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Riêng tư</span>
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Thông báo</span>
            </TabsTrigger>
            <TabsTrigger value="appearance">
              <Palette className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Giao diện</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cá nhân</CardTitle>
                  <CardDescription>
                    Cập nhật thông tin hồ sơ của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback>
                        {profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Đổi ảnh đại diện
                      </Button>
                      <p className="text-sm text-muted-foreground mt-2">
                        JPG, PNG hoặc GIF. Tối đa 5MB.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Username */}
                  <div className="space-y-2">
                    <Label htmlFor="username">Tên người dùng</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                      placeholder="Nhập tên người dùng"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="Nhập email"
                    />
                  </div>

                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Tiểu sử</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Viết vài dòng về bạn..."
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      {profile.bio.length}/200 ký tự
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Cài đặt riêng tư</CardTitle>
                  <CardDescription>
                    Quản lý ai có thể xem thông tin của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Hiển thị trạng thái online</Label>
                      <p className="text-sm text-muted-foreground">
                        Cho phép người khác thấy khi bạn đang online
                      </p>
                    </div>
                    <Switch
                      checked={privacy.showOnlineStatus}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, showOnlineStatus: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Xác nhận đã đọc tin nhắn</Label>
                      <p className="text-sm text-muted-foreground">
                        Gửi xác nhận khi bạn đọc tin nhắn
                      </p>
                    </div>
                    <Switch
                      checked={privacy.showReadReceipts}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, showReadReceipts: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Cho phép tin nhắn từ người lạ</Label>
                      <p className="text-sm text-muted-foreground">
                        Nhận tin nhắn từ người không phải bạn bè
                      </p>
                    </div>
                    <Switch
                      checked={privacy.allowMessageRequests}
                      onCheckedChange={(checked) =>
                        setPrivacy({ ...privacy, allowMessageRequests: checked })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Thông báo</CardTitle>
                  <CardDescription>
                    Chọn thông báo bạn muốn nhận
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {Object.entries({
                    messageNotifications: 'Tin nhắn mới',
                    friendRequests: 'Lời mời kết bạn',
                    groupInvites: 'Lời mời vào nhóm',
                    mentions: 'Được nhắc đến',
                  }).map(([key, label]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between">
                        <Label>{label}</Label>
                        <Switch
                          checked={notifications[key as keyof typeof notifications]}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, [key]: checked })
                          }
                        />
                      </div>
                      {key !== 'mentions' && <Separator className="mt-6" />}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Giao diện</CardTitle>
                  <CardDescription>
                    Tùy chỉnh giao diện ứng dụng
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Chế độ tối</Label>
                      <p className="text-sm text-muted-foreground">
                        Bật/tắt chế độ tối
                      </p>
                    </div>
                    <Switch
                      checked={appearance.darkMode}
                      onCheckedChange={(checked) =>
                        setAppearance({ ...appearance, darkMode: checked })
                      }
                    />
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Kích thước chữ: {appearance.fontSize}px</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Điều chỉnh kích thước chữ trong tin nhắn
                      </p>
                    </div>
                    <Slider
                      value={[appearance.fontSize]}
                      onValueChange={([value]) =>
                        setAppearance({ ...appearance, fontSize: value })
                      }
                      min={12}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Nhỏ</span>
                      <span>Lớn</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div>
                      <Label>Khoảng cách tin nhắn: {appearance.messageSpacing}</Label>
                      <p className="text-sm text-muted-foreground mb-3">
                        Điều chỉnh khoảng cách giữa các tin nhắn
                      </p>
                    </div>
                    <Slider
                      value={[appearance.messageSpacing]}
                      onValueChange={([value]) =>
                        setAppearance({ ...appearance, messageSpacing: value })
                      }
                      min={1}
                      max={5}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Gần</span>
                      <span>Xa</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

