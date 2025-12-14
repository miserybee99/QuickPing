'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Moon, Sun, Type, Bell, Lock, User as UserIcon, X, Monitor, BellRing, BellOff, Settings, Save, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader } from '@/components/layout';
import { PageWrapper } from '@/components/layout';
import { AvatarUploadDropzone } from '@/components/profile/avatar-upload-dropzone';
import { Badge } from '@/components/ui/badge';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const { theme: savedTheme, setTheme: applySavedTheme, fontSize: savedFontSize, setFontSize: applySavedFontSize, resolvedTheme } = useTheme();
  
  // Profile state
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    avatar_url: '',
    mssv: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Pending (unsaved) settings - these are what user sees but not yet applied
  const [pendingTheme, setPendingTheme] = useState<Theme>(savedTheme);
  const [pendingFontSize, setPendingFontSize] = useState<FontSize>(savedFontSize);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Load profile data
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
  
  // Sync pending state with saved state on mount
  useEffect(() => {
    setPendingTheme(savedTheme);
    setPendingFontSize(savedFontSize);
  }, [savedTheme, savedFontSize]);
  
  // Track unsaved changes
  useEffect(() => {
    const themeChanged = pendingTheme !== savedTheme;
    const fontSizeChanged = pendingFontSize !== savedFontSize;
    setHasUnsavedChanges(themeChanged || fontSizeChanged);
  }, [pendingTheme, pendingFontSize, savedTheme, savedFontSize]);
  
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
          body: 'Notifications enabled successfully!',
          icon: '/logo.png',
        });
      }
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (url: string) => {
    setProfile(prev => ({ ...prev, avatar_url: url }));
    
    try {
      await apiClient.users.updateProfile({ avatar_url: url });
      if (user) {
        updateUser({ ...user, avatar_url: url });
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
      setProfile(prev => ({ ...prev, avatar_url: user?.avatar_url || '' }));
    }
  };

  // Handle save profile
  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiClient.users.updateProfile({
        username: profile.username,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
      });
      
      if (user) {
        updateUser({ ...user, ...profile });
      }
      
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Could not update profile. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    try {
      setSaving(true);
      
      // Apply pending appearance changes
      if (pendingTheme !== savedTheme) {
        applySavedTheme(pendingTheme);
      }
      if (pendingFontSize !== savedFontSize) {
        applySavedFontSize(pendingFontSize);
      }
      
      // Save to backend
      await apiClient.users.updatePreferences({
        theme: pendingTheme,
        font_size: pendingFontSize,
        notifications,
        privacy,
      });
      
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetAppearance = () => {
    setPendingTheme(savedTheme);
    setPendingFontSize(savedFontSize);
  };
  
  const handleResetToDefaults = () => {
    setPendingTheme('system');
    setPendingFontSize('medium');
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
        title="Settings"
        subtitle="Manage your account and customize your experience"
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
          <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>

        {/* ====================================================================== */}
        {/* PROFILE TAB */}
        {/* ====================================================================== */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Update your personal information and avatar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-4">
                <Label>Avatar</Label>
                <AvatarUploadDropzone
                  currentAvatarUrl={profile.avatar_url}
                  onAvatarChange={handleAvatarUpload}
                  username={profile.username}
                />
              </div>

              <Separator />

              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Your username"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* MSSV (read-only) */}
              {profile.mssv && (
                <div className="space-y-2">
                  <Label htmlFor="mssv">Student ID (MSSV)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="mssv"
                      value={profile.mssv}
                      disabled
                      className="bg-muted"
                    />
                    <Badge variant="secondary">Verified</Badge>
                  </div>
                </div>
              )}

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>

              {/* Save Button */}
              <Button onClick={handleSaveProfile} disabled={savingProfile} className="w-full">
                {savingProfile ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

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
                Choose light, dark, or system theme
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Theme Options */}
              <div className="grid grid-cols-3 gap-3">
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingTheme === 'light'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingTheme('light')}
                >
                  <Sun className={`w-6 h-6 ${pendingTheme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${pendingTheme === 'light' ? 'text-primary' : ''}`}>Light</span>
                </div>
                
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingTheme === 'dark'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingTheme('dark')}
                >
                  <Moon className={`w-6 h-6 ${pendingTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${pendingTheme === 'dark' ? 'text-primary' : ''}`}>Dark</span>
                </div>
                
                <div
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingTheme === 'system'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingTheme('system')}
                >
                  <Monitor className={`w-6 h-6 ${pendingTheme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`text-sm font-medium ${pendingTheme === 'system' ? 'text-primary' : ''}`}>System</span>
                </div>
              </div>
              
              {pendingTheme === 'system' && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Theme will automatically change based on your system settings.
                  Currently using {resolvedTheme === 'dark' ? 'dark' : 'light'} mode.
                </p>
              )}
              
              {hasUnsavedChanges && (
                <p className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg">
                  ⚠️ You have unsaved changes. Click "Save Changes" to apply.
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
                Adjust font size in the application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Font Size Options */}
              <div className="space-y-3">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingFontSize === 'small'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingFontSize('small')}
                >
                  <span className="text-sm">Small (14px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    pendingFontSize === 'small' ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}></div>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingFontSize === 'medium'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingFontSize('medium')}
                >
                  <span className="text-base">Medium (16px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    pendingFontSize === 'medium' ? 'bg-primary border-primary' : 'border-muted-foreground'
                  }`}></div>
                </div>

                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    pendingFontSize === 'large'
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                  onClick={() => setPendingFontSize('large')}
                >
                  <span className="text-lg">Large (18px)</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    pendingFontSize === 'large' ? 'bg-primary border-primary' : 'border-muted-foreground'
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
                  This is a sample text to preview font size
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleResetAppearance}
              disabled={!hasUnsavedChanges}
            >
              Discard Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
            >
              Reset to Defaults
            </Button>
            <Button onClick={handleSavePreferences} disabled={saving || !hasUnsavedChanges}>
              {saving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
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
                Desktop Notifications
              </CardTitle>
              <CardDescription>
                Receive notifications even when the app is not open
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
                      <p className="font-medium text-green-700 dark:text-green-300">Notifications enabled</p>
                      <p className="text-sm text-green-600 dark:text-green-400">You will receive notifications from QuickPing</p>
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
                      <p className="font-medium text-red-700 dark:text-red-300">Notifications blocked</p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        Please enable notifications in your browser settings
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
                        <p className="font-medium">Enable Desktop Notifications</p>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications even when QuickPing tab is not open
                        </p>
                      </div>
                    </div>
                    <Button onClick={requestNotificationPermission}>
                      Enable
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
                      Do Not Disturb
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable all notifications
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
                  🔕 Do Not Disturb mode is on. You won't receive any notifications.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Notification Types Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose which notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="notif-messages" className="font-medium">
                      New Messages
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive new messages
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
                      Friend Requests
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you receive friend requests
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
                      Group Invites
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're invited to a group
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
                      Mentions
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified when someone mentions you
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
                      Notification Sound
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Play sound when receiving notifications
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
              {saving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
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
                Activity Status
              </CardTitle>
              <CardDescription>
                Control who can see your status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="online-status" className="font-medium">
                    Show Online Status
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see when you're online
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
                    Read Receipts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see when you've read messages
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
                Contact Permissions
              </CardTitle>
              <CardDescription>
                Control who can contact you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label className="font-medium">Who can message you?</Label>
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
                      <span className="text-sm">Everyone</span>
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
                      <span className="text-sm">Friends Only</span>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <Label className="font-medium">Who can add you to groups?</Label>
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
                      <span className="text-sm">Everyone</span>
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
                      <span className="text-sm">Friends Only</span>
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
                      <span className="text-sm">No One</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} disabled={saving}>
              {saving ? 'Saving...' : saveSuccess ? '✓ Saved' : 'Save Changes'}
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
                Account
              </CardTitle>
              <CardDescription>
                Manage your account
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
                  <Label className="font-medium">Student ID</Label>
                  <p className="text-sm text-gray-600 mt-1">{user?.mssv || 'Not set'}</p>
                </div>

                <Separator />

                <div className="pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/profile')}
                  >
                    Edit Profile
                  </Button>
                </div>

                <Separator />

                <div className="pt-4">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={handleLogout}
                  >
                    Sign Out
                  </Button>
                </div>

                <div className="pt-2">
                  <Button
                    variant="ghost"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete Account
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

