'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Moon, Sun, User as UserIcon, X, Monitor, Settings, Save, Loader2, Palette, UserCircle, LogOut, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader } from '@/components/layout';
import { PageWrapper } from '@/components/layout';
import { AvatarUploadDropzone } from '@/components/profile/avatar-upload-dropzone';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

export default function SettingsPage() {
  const router = useRouter();
  const { user, updateUser } = useUser();
  const { theme: savedTheme, setTheme: applySavedTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  
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
  }, [savedTheme]);
  
  // Track unsaved changes
  useEffect(() => {
    const themeChanged = pendingTheme !== savedTheme;
    setHasUnsavedChanges(themeChanged);
  }, [pendingTheme, savedTheme]);
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences'>('profile');

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
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
        variant: "success"
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      const errorMessage = error?.response?.data?.error || 'Could not update profile. Please try again.';
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
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
      
      // Save to backend (only theme now)
      await apiClient.users.updatePreferences({
        theme: pendingTheme,
      });
      
      setHasUnsavedChanges(false);
      setSaveSuccess(true);
      
      toast({
        title: "Settings Saved",
        description: "Your preferences have been saved successfully.",
        variant: "success"
      });
      
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error('Error saving preferences:', error);
      const errorMessage = error?.response?.data?.error || 'Could not save settings. Please try again.';
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const handleResetAppearance = () => {
    setPendingTheme(savedTheme);
  };
  
  const handleResetToDefaults = () => {
    setPendingTheme('system');
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
        <div className="container max-w-5xl mx-auto py-8 px-4 sm:px-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'profile' | 'preferences')} className="w-full">
            {/* Custom Tabs with Primary Color Active State - Matching Sidebar Style */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={() => setActiveTab('profile')}
                className={cn(
                  "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200",
                  activeTab === 'profile'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <UserCircle className="w-4 h-4" strokeWidth={activeTab === 'profile' ? 2.5 : 2} />
                Profile
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={cn(
                  "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200",
                  activeTab === 'preferences'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Palette className="w-4 h-4" strokeWidth={activeTab === 'preferences' ? 2.5 : 2} />
                Preferences
              </button>
            </div>

        {/* PROFILE TAB */}
            <TabsContent value="profile" className="space-y-6 mt-0">
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Profile Information</CardTitle>
                      <CardDescription className="mt-1">
                Update your personal information and avatar
              </CardDescription>
                    </div>
                  </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Avatar</Label>
                    <div className="p-4 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20">
                <AvatarUploadDropzone
                  currentAvatarUrl={profile.avatar_url}
                  onAvatarChange={handleAvatarUpload}
                  username={profile.username}
                />
                    </div>
              </div>

                  <Separator className="my-6" />

                  {/* Form Fields */}
                  <div className="grid gap-6">
              {/* Username */}
              <div className="space-y-2">
                      <Label htmlFor="username" className="text-sm font-semibold">
                        Username
                      </Label>
                <Input
                  id="username"
                  value={profile.username}
                  onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your username"
                        className="h-11"
                />
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-semibold">
                        Email Address
                      </Label>
                <Input
                  id="email"
                  value={profile.email}
                  disabled
                        className="h-11 bg-muted/50 cursor-not-allowed"
                />
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span>•</span> Email cannot be changed for security reasons
                </p>
              </div>

              {/* MSSV (read-only) */}
              {profile.mssv && (
                <div className="space-y-2">
                        <Label htmlFor="mssv" className="text-sm font-semibold">
                          Student ID (MSSV)
                        </Label>
                        <div className="flex items-center gap-3">
                    <Input
                      id="mssv"
                      value={profile.mssv}
                      disabled
                            className="h-11 bg-muted/50 cursor-not-allowed flex-1"
                    />
                          <Badge variant="secondary" className="px-3 py-1.5">
                            Verified
                          </Badge>
                  </div>
                </div>
              )}

              {/* Bio */}
              <div className="space-y-2">
                      <Label htmlFor="bio" className="text-sm font-semibold">
                        Bio
                      </Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                  placeholder="Tell us about yourself..."
                  rows={4}
                        className="resize-none"
                />
                      <p className="text-xs text-muted-foreground">
                        A brief description about yourself (optional)
                      </p>
                    </div>
              </div>

                  <Separator className="my-6" />

              {/* Save Button */}
                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={savingProfile} 
                    className="w-full h-11 text-base font-semibold"
                    size="lg"
                  >
                {savingProfile ? (
                  <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Saving Changes...
                  </>
                ) : (
                  <>
                        <Save className="h-5 w-5" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

            {/* PREFERENCES TAB */}
            <TabsContent value="preferences" className="space-y-6 mt-0">
              {/* Appearance Section */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      {resolvedTheme === 'dark' ? (
                        <Moon className="w-5 h-5 text-primary" />
                      ) : (
                        <Sun className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl">Appearance</CardTitle>
                      <CardDescription className="mt-1">
                        Customize your theme and visual preferences
              </CardDescription>
                    </div>
                  </div>
            </CardHeader>
                <CardContent className="space-y-6">
              {/* Theme Options */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Theme</Label>
                    <div className="grid grid-cols-3 gap-4">
                <div
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                    pendingTheme === 'light'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-muted-foreground/50 bg-background'
                  }`}
                  onClick={() => setPendingTheme('light')}
                >
                        <div className={`p-3 rounded-lg ${
                          pendingTheme === 'light' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                  <Sun className={`w-6 h-6 ${pendingTheme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`text-sm font-medium ${pendingTheme === 'light' ? 'text-primary' : 'text-foreground'}`}>
                          Light
                        </span>
                        {pendingTheme === 'light' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                </div>
                
                <div
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                    pendingTheme === 'dark'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-muted-foreground/50 bg-background'
                  }`}
                  onClick={() => setPendingTheme('dark')}
                >
                        <div className={`p-3 rounded-lg ${
                          pendingTheme === 'dark' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                  <Moon className={`w-6 h-6 ${pendingTheme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`text-sm font-medium ${pendingTheme === 'dark' ? 'text-primary' : 'text-foreground'}`}>
                          Dark
                        </span>
                        {pendingTheme === 'dark' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                </div>
                
                <div
                        className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 cursor-pointer transition-all hover:scale-105 ${
                    pendingTheme === 'system'
                            ? 'border-primary bg-primary/5 shadow-md'
                            : 'border-border hover:border-muted-foreground/50 bg-background'
                  }`}
                  onClick={() => setPendingTheme('system')}
                >
                        <div className={`p-3 rounded-lg ${
                          pendingTheme === 'system' ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                  <Monitor className={`w-6 h-6 ${pendingTheme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className={`text-sm font-medium ${pendingTheme === 'system' ? 'text-primary' : 'text-foreground'}`}>
                          System
                        </span>
                        {pendingTheme === 'system' && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                </div>
              </div>
              
              {pendingTheme === 'system' && (
                      <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                  Theme will automatically change based on your system settings.
                          Currently using <span className="font-semibold">{resolvedTheme === 'dark' ? 'dark' : 'light'}</span> mode.
                </p>
                      </div>
              )}
              
              {hasUnsavedChanges && (
                      <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                        <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                          <span>⚠️</span>
                          You have unsaved changes. Click "Save Changes" to apply.
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleResetAppearance}
              disabled={!hasUnsavedChanges}
                      className="h-11"
            >
              Discard Changes
            </Button>
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
                      className="h-11"
            >
              Reset to Defaults
            </Button>
                    <Button 
                      onClick={handleSavePreferences} 
                      disabled={saving || !hasUnsavedChanges}
                      className="h-11 min-w-[140px]"
                      size="lg"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : saveSuccess ? (
                        <>
                          <span>✓</span>
                          Saved
                        </>
                      ) : (
                        'Save Changes'
                      )}
            </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Account Section */}
              <Card className="shadow-sm border">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <UserCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Account Information</CardTitle>
                      <CardDescription className="mt-1">
                        View your account details and manage account actions
                      </CardDescription>
                    </div>
                  </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b">
                  <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
                        <p className="text-sm font-medium mt-1">{user?.email}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b">
                <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Username</Label>
                        <p className="text-sm font-medium mt-1">{user?.username}</p>
                  </div>
                </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b">
                <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">Student ID</Label>
                        <p className="text-sm font-medium mt-1">{user?.mssv || 'Not set'}</p>
                      </div>
                    </div>

                    <Separator className="my-4" />

                    <div className="space-y-3 pt-2">
                  <Button
                    variant="outline"
                        className="w-full h-11 justify-start"
                    onClick={() => router.push('/profile')}
                  >
                        <UserIcon className="w-4 h-4 mr-2" />
                        View Full Profile
                  </Button>

                  <Button
                    variant="destructive"
                        className="w-full h-11 justify-start"
                    onClick={handleLogout}
                  >
                        <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>

                  <Button
                    variant="ghost"
                        className="w-full h-11 justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                        <Trash2 className="w-4 h-4 mr-2" />
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

