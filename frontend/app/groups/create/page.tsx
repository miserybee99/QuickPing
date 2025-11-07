'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { useRouter } from 'next/navigation';

const steps = [
  { id: 1, title: 'Thông tin nhóm', description: 'Tên và mô tả' },
  { id: 2, title: 'Thêm thành viên', description: 'Mời người vào nhóm' },
  { id: 3, title: 'Hoàn tất', description: 'Xem lại và tạo' },
];

// Mock users
const mockUsers = [
  { _id: '1', username: 'nguyenvana', email: 'nguyenvana@example.com', avatar_url: '' },
  { _id: '2', username: 'tranthib', email: 'tranthib@example.com', avatar_url: '' },
  { _id: '3', username: 'phamvanc', email: 'phamvanc@example.com', avatar_url: '' },
];

export default function CreateGroupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [groupData, setGroupData] = useState({
    name: '',
    description: '',
    members: [] as string[],
  });

  const handleNext = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreateGroup = () => {
    // TODO: API call
    console.log('Creating group:', groupData);
    router.push('/groups');
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
    <div className="min-h-screen bg-background">
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
                    <h2 className="text-2xl font-bold">Tạo nhóm mới</h2>
                    <p className="text-muted-foreground">
                      Bắt đầu bằng cách đặt tên và mô tả cho nhóm
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Tên nhóm *</Label>
                      <Input
                        id="name"
                        placeholder="Nhập tên nhóm"
                        value={groupData.name}
                        onChange={(e) =>
                          setGroupData({ ...groupData, name: e.target.value })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Mô tả</Label>
                      <Textarea
                        id="description"
                        placeholder="Mô tả về nhóm..."
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
                    <h2 className="text-2xl font-bold">Thêm thành viên</h2>
                    <p className="text-muted-foreground">
                      Chọn người bạn muốn mời vào nhóm
                    </p>
                  </div>

                  <div className="space-y-3">
                    {mockUsers.map((user) => (
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

                  <p className="text-sm text-muted-foreground text-center">
                    Đã chọn {groupData.members.length} thành viên
                  </p>
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
                    <h2 className="text-2xl font-bold">Xem lại thông tin</h2>
                    <p className="text-muted-foreground">
                      Kiểm tra lại trước khi tạo nhóm
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Tên nhóm</p>
                      <p className="font-semibold">{groupData.name}</p>
                    </div>

                    {groupData.description && (
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Mô tả</p>
                        <p>{groupData.description}</p>
                      </div>
                    )}

                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-3">
                        Thành viên ({groupData.members.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {groupData.members.map((memberId) => {
                          const user = mockUsers.find((u) => u._id === memberId);
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
                  Quay lại
                </Button>

                {currentStep < 3 ? (
                  <Button
                    onClick={handleNext}
                    disabled={currentStep === 1 && !groupData.name}
                  >
                    Tiếp theo
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={handleCreateGroup}>
                    <Check className="h-4 w-4 mr-2" />
                    Tạo nhóm
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

