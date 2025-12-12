'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, User as UserIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/hooks/useUser';
import { apiClient } from '@/lib/api-client';
import { AvatarUploadDropzone } from '@/components/profile/avatar-upload-dropzone';
import { PageHeader } from '@/components/layout';
import { PageContainer, PageWrapper } from '@/components/layout';

export default function ProfilePage() {
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

  const handleAvatarUpload = async (url: string) => {
    // Update local state immediately for visual feedback
    setProfile(prev => ({ ...prev, avatar_url: url }));
    
    try {
      // Save to backend
      await apiClient.users.updateProfile({
        avatar_url: url,
      });
      
      // Update localStorage
      if (user) {
        const updatedUser = { ...user, avatar_url: url };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      // Revert on error
      setProfile(prev => ({ ...prev, avatar_url: user?.avatar_url || '' }));
    }
  };

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
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Could not update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper>
      <PageHeader
        icon={UserIcon}
        title="Profile"
        subtitle="Manage your personal information"
        showBackButton
        actions={
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        }
      />

      <PageContainer maxWidth="lg">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
            >
          {/* Profile Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>
                Update your publicly visible profile information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar Upload Dropzone */}
                <AvatarUploadDropzone
                  currentAvatarUrl={profile.avatar_url}
                  username={profile.username}
                  onAvatarChange={handleAvatarUpload}
                />
                
                {/* User Info */}
                <div className="flex-1 text-center sm:text-left pt-4">
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  <p className="text-muted-foreground">{profile.email}</p>
                  {user?.role && (
                    <Badge variant="secondary" className="mt-2">
                      {user.role}
                    </Badge>
                  )}
                  {user?.is_online && (
                    <Badge variant="default" className="mt-2 ml-2 bg-green-500">
                      Online
                    </Badge>
                  )}
                </div>
              </div>

                  <Separator />

              {/* Profile Fields */}
              <div className="grid gap-6">
                  {/* Username */}
                  <div className="space-y-2">
                  <Label htmlFor="username">Display Name</Label>
                    <Input
                      id="username"
                      value={profile.username}
                      onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    placeholder="Enter display name"
                    />
                  <p className="text-xs text-muted-foreground">
                    This name will be visible to others
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
                    Email cannot be changed
                  </p>
                </div>

                {/* MSSV */}
                {profile.mssv && (
                  <div className="space-y-2">
                    <Label htmlFor="mssv">Student ID</Label>
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
                  <Label htmlFor="bio">About</Label>
                    <Textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                      placeholder="Write a few lines about yourself..."
                      rows={4}
                    maxLength={200}
                    />
                  <p className="text-xs text-muted-foreground text-right">
                      {profile.bio.length}/200 characters
                    </p>
                  </div>
                  </div>
                </CardContent>
              </Card>

          {/* Account Stats */}
              <Card>
                <CardHeader>
              <CardTitle>Account Statistics</CardTitle>
                </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Friends</p>
                      </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Groups</p>
                    </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-sm text-muted-foreground">Messages</p>
                    </div>
                <div className="text-center p-4 border rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {user?.is_verified ? '✓' : '✗'}
                  </p>
                  <p className="text-sm text-muted-foreground">Verified</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
      </PageContainer>
    </PageWrapper>
  );
}
