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
import { Moon, Sun, User as UserIcon, X, Settings, Save, Loader2, UserCircle, LogOut, Mail, User, GraduationCap, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useUser } from '@/hooks/useUser';
import { useTheme } from '@/contexts/ThemeContext';
import { PageHeader } from '@/components/layout';
import { PageWrapper } from '@/components/layout';
import { AvatarUploadDropzone } from '@/components/profile/avatar-upload-dropzone';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark';

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
  
  // Normalize savedTheme to 'light' or 'dark' (remove 'system')
  const currentTheme: Theme = savedTheme === 'system' 
    ? (resolvedTheme === 'dark' ? 'dark' : 'light')
    : (savedTheme === 'dark' ? 'dark' : 'light');

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

  const handleThemeChange = async (theme: Theme) => {
    try {
      // Apply theme immediately
      applySavedTheme(theme);
      
      // Save to backend
      await apiClient.users.updatePreferences({
        theme: theme,
      });
      
      toast({
        title: "Theme Updated",
        description: `Theme changed to ${theme === 'dark' ? 'dark' : 'light'} mode.`,
        variant: "success"
      });
    } catch (error: any) {
      console.error('Error saving theme:', error);
      const errorMessage = error?.response?.data?.error || 'Could not save theme. Please try again.';
      toast({
        title: "Save Failed",
        description: errorMessage,
        variant: "destructive"
      });
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
          <Card className="shadow-sm border border-border/50">
            <CardHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                  <UserCircle className="w-6 h-6 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold">Profile Information</CardTitle>
                  <CardDescription className="mt-1.5 text-base">
                    Update your personal information and avatar
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Avatar & Appearance */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Avatar */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Avatar
                    </Label>
                    <div className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors flex flex-col items-center justify-center">
                      <AvatarUploadDropzone
                        currentAvatarUrl={profile.avatar_url}
                        onAvatarChange={handleAvatarUpload}
                        username={profile.username}
                        size="md"
                      />
                    </div>
                  </div>

                  {/* Appearance */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Appearance</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={currentTheme === 'light' ? 'default' : 'outline'}
                        onClick={() => handleThemeChange('light')}
                        className={cn(
                          "flex-1 h-10",
                          currentTheme === 'light' && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Sun className="w-4 h-4 mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={currentTheme === 'dark' ? 'default' : 'outline'}
                        onClick={() => handleThemeChange('dark')}
                        className={cn(
                          "flex-1 h-10",
                          currentTheme === 'dark' && "bg-primary text-primary-foreground"
                        )}
                      >
                        <Moon className="w-4 h-4 mr-2" />
                        Dark
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Column - Account Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Form Fields */}
                  <div className="grid gap-5">
                    {/* Username */}
                    <div className="space-y-2.5">
                      <Label htmlFor="username" className="text-sm font-semibold flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        Username
                      </Label>
                      <Input
                        id="username"
                        value={profile.username}
                        onChange={(e) => setProfile(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="Enter your username"
                        className="h-12 text-base"
                      />
                    </div>

                    {/* Email (read-only) */}
                    <div className="space-y-2.5">
                      <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        value={profile.email}
                        disabled
                        className="h-12 bg-muted/50 cursor-not-allowed text-base"
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        Email cannot be changed for security reasons
                      </p>
                    </div>

                    {/* MSSV (read-only) */}
                    {profile.mssv && (
                      <div className="space-y-2.5">
                        <Label htmlFor="mssv" className="text-sm font-semibold flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-muted-foreground" />
                          Student ID (MSSV)
                        </Label>
                        <div className="flex items-center gap-3">
                          <Input
                            id="mssv"
                            value={profile.mssv}
                            disabled
                            className="h-12 bg-muted/50 cursor-not-allowed text-base flex-1"
                          />
                          <Badge variant="secondary" className="px-4 py-2 text-sm font-semibold">
                            Verified
                          </Badge>
                        </div>
                      </div>
                    )}

                    {/* Bio */}
                    <div className="space-y-2.5">
                      <Label htmlFor="bio" className="text-sm font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        rows={4}
                        className="resize-none text-base"
                      />
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                        A brief description about yourself (optional)
                      </p>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button 
                      onClick={handleSaveProfile} 
                      disabled={savingProfile} 
                      className="flex-1 sm:flex-none h-12 text-base font-semibold shadow-sm hover:shadow-md transition-shadow"
                      size="lg"
                    >
                      {savingProfile ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Saving Changes...
                        </>
                      ) : (
                        'Save Profile'
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleLogout}
                      className="flex-1 sm:flex-none h-12 text-base font-semibold"
                      size="lg"
                    >
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </PageWrapper>
  );
}

