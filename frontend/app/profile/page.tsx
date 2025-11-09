'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Camera, Save, User as UserIcon, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useRouter } from 'next/navigation';
import { useUser } from '@/hooks/useUser';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';

export default function ProfilePage() {
  const router = useRouter();
  const { user } = useUser();
  const [saving, setSaving] = useState(false);

  // Profile state
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    avatar_url: '',
    mssv: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        avatar_url: user.avatar_url || '',
        mssv: user.mssv || '',
  });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.users.updateProfile({
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
      });
      
      // Update localStorage
      if (user) {
        const updatedUser = { ...user, ...profile };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      
      alert('Cập nhật profile thành công!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Không thể cập nhật profile. Vui lòng thử lại.');
    } finally {
      setSaving(false);
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
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <UserIcon className="h-6 w-6" />
                  Hồ sơ cá nhân
                </h1>
                <p className="text-sm text-muted-foreground">
                  Quản lý thông tin cá nhân của bạn
                </p>
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
              <Save className="h-4 w-4 mr-2" />
                  Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
            >
          {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Thông tin cá nhân</CardTitle>
                  <CardDescription>
                Cập nhật thông tin hồ sơ hiển thị công khai của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="h-32 w-32">
                      <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-4xl">
                        {profile.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  {user?.is_online && (
                    <div className="absolute bottom-2 right-2 h-6 w-6 rounded-full bg-green-500 border-4 border-background" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left">
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                  {user?.role && (
                    <Badge variant="secondary" className="mt-2">
                      {user.role}
                    </Badge>
                  )}
                  <div className="mt-4">
                      <Button variant="outline" size="sm">
                        <Camera className="h-4 w-4 mr-2" />
                        Đổi ảnh đại diện
                      </Button>
                    <p className="text-xs text-muted-foreground mt-2">
                        JPG, PNG hoặc GIF. Tối đa 5MB.
                      </p>
                  </div>
                    </div>
                  </div>

                  <Separator />

              {/* Profile Fields */}
              <div className="grid gap-6">
                  {/* Username */}
                  <div className="space-y-2">
                  <Label htmlFor="username">Tên hiển thị</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="Nhập tên hiển thị"
                    />
                  <p className="text-xs text-muted-foreground">
                    Tên này sẽ hiển thị cho người khác khi họ nhìn thấy bạn
                  </p>
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email không thể thay đổi
                  </p>
                </div>

                {/* MSSV */}
                {profile.mssv && (
                  <div className="space-y-2">
                    <Label htmlFor="mssv">Mã số sinh viên</Label>
                    <Input
                      id="mssv"
                      value={profile.mssv}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}

                  {/* Bio */}
                  <div className="space-y-2">
                  <Label htmlFor="bio">Giới thiệu bản thân</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Viết vài dòng về bạn..."
                      rows={4}
                    maxLength={200}
                    />
                  <p className="text-xs text-muted-foreground text-right">
                      {profile.bio.length}/200 ký tự
                    </p>
                  </div>
                  </div>
                </CardContent>
              </Card>

          {/* Account Stats */}
              <Card>
                <CardHeader>
              <CardTitle>Thống kê tài khoản</CardTitle>
                </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Bạn bè</p>
                      </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Nhóm</p>
                    </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Tin nhắn</p>
                    </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {user?.is_verified ? '✓' : '✗'}
                  </p>
                  <p className="text-sm text-muted-foreground">Xác thực</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
      </div>
    </div>
  );
}
