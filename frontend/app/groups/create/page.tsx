'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { User } from '@/types';

const steps = [
  { id: 1, title: 'Group Info', description: 'Name and description' },
  { id: 2, title: 'Add Members', description: 'Invite people to group' },
  { id: 3, title: 'Complete', description: 'Review and create' },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    members: [] as string[],
  });
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const response = await apiClient.friends.getAll();
      setAvailableUsers(response.data.friends || []);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    // Validate step 2: minimum 2 members
    if (currentStep === 2 && groupData.members.length < 2) {
      alert('Please select at least 2 members to create a group');
      return;
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreateGroup = async () => {
    if (groupData.members.length < 2) {
      alert('Group must have at least 2 members');
      return;
    }
    
    setCreating(true);
    try {
      await apiClient.conversations.createGroup({
        name: groupData.name,
        description: groupData.description,
        participant_ids: groupData.members,
      });
      router.push('/groups');
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Could not create group. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const toggleMember = (userId: string) => {
    setGroupData((prev) => ({
      ...prev,
      members: prev.members.includes(userId)
        ? prev.members.filter((id) => id !== userId)
        : [...prev.members, userId],
    }));
  };

  return (
    <div className="h-screen overflow-auto bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <motion.div
                      initial={false}
                      animate={{
                        scale: currentStep === step.id ? 1.1 : 1,
                        backgroundColor:
                          currentStep >= step.id
                            ? 'rgb(59, 130, 246)'
                            : 'rgb(229, 231, 235)',
                      }}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                    >
                      {currentStep > step.id ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        step.id
                      )}
                    </motion.div>
                    <div className="mt-2 text-center">
                      <p className="text-sm font-medium">{step.title}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-1 h-0.5 bg-border mx-2 mt-[-2rem]" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <Card>
            <CardContent className="p-8">
              {/* Step 1: Group Info */}
              {currentStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <Users className="h-16 w-16 mx-auto mb-4 text-primary" />
                    <h2 className="text-2xl font-bold">Create New Group</h2>
                    <p className="text-muted-foreground">
                      Start by setting a name and description for the group
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Group Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter group name"
                        value={groupData.name}
                        onChange={(e) =>
                          setGroupData({ ...groupData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe the group..."
                        rows={4}
                        value={groupData.description}
                        onChange={(e) =>
                          setGroupData({
                            ...groupData,
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Add Members */}
              {currentStep === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold">Add Members</h2>
                    <p className="text-muted-foreground">
                      Select friends to invite to the group
                    </p>
                  </div>

                  {loading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>You have no friends to add to the group</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-3">
                        {availableUsers.map((user) => (
                          <div
                            key={user._id}
                            className="flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => toggleMember(user._id)}
                          >
                            <Checkbox
                              checked={groupData.members.includes(user._id)}
                              onCheckedChange={() => toggleMember(user._id)}
                            />
                            <Avatar>
                              <AvatarImage src={user.avatar_url} />
                              <AvatarFallback>
                                {user.username?.[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold">{user.username}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {groupData.members.length} members selected
                    </p>
                    {groupData.members.length < 2 && (
                      <p className="text-sm text-orange-600">
                        ⚠️ Select at least 2 members to create a group
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center mb-8">
                    <Check className="h-16 w-16 mx-auto mb-4 text-green-500" />
                    <h2 className="text-2xl font-bold">Review Information</h2>
                    <p className="text-muted-foreground">
                      Check before creating the group
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Group Name</p>
                      <p className="font-semibold">{groupData.name}</p>
                    </div>

                    {groupData.description && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p>{groupData.description}</p>
                      </div>
                    )}

                    {groupData.members.length > 0 && (
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        Members ({groupData.members.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groupData.members.map((memberId) => {
                            const user = availableUsers.find((u) => u._id === memberId);
                          return (
                            <div
                              key={memberId}
                              className="flex items-center gap-2 px-3 py-1.5 bg-background rounded-full border"
                            >
                              <Avatar className="h-5 w-5">
                                <AvatarImage src={user?.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {user?.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{user?.username}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !groupData.name}
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateGroup} disabled={creating}>
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Group
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

