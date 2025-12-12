'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, MessageSquare, UserPlus, Ban } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { getFileUrl } from '@/lib/file-utils';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  is_online: boolean;
  last_seen?: Date;
}

interface UserProfileModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onMessage?: (userId: string) => void;
  onAddFriend?: (userId: string) => void;
  onBlock?: (userId: string) => void;
}

export function UserProfileModal({
  user,
  isOpen,
  onClose,
  onMessage,
  onAddFriend,
  onBlock,
}: UserProfileModalProps) {
  if (!user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-background rounded-lg shadow-2xl w-full max-w-md overflow-hidden"
            >
              {/* Header với gradient background */}
              <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute top-4 right-4 text-white hover:bg-white/20"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Avatar */}
              <div className="px-6 -mt-16 relative">
                <div className="relative inline-block">
                  <Avatar className="h-24 w-24 border-4 border-background">
                    <AvatarImage src={getFileUrl(user.avatar_url)} />
                    <AvatarFallback className="text-2xl">
                      {user.username?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {user.is_online && (
                    <div className="absolute bottom-2 right-2 h-5 w-5 rounded-full bg-green-500 border-4 border-background" />
                  )}
                </div>
              </div>

              {/* User Info */}
              <div className="px-6 py-4">
                <h2 className="text-2xl font-bold">{user.username}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Mail className="h-4 w-4" />
                  {user.email}
                </div>
                
                {user.is_online ? (
                  <Badge className="mt-2 bg-green-500">● Online</Badge>
                ) : (
                  <div className="mt-2">
                    <Badge variant="secondary">Offline</Badge>
                    {user.last_seen && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Last seen {formatDistanceToNow(new Date(user.last_seen), { addSuffix: true, locale: enUS })}
                      </p>
                    )}
                  </div>
                )}

                {user.bio && (
                  <>
                    <Separator className="my-4" />
                    <div>
                      <p className="text-sm font-semibold mb-2">Bio</p>
                      <p className="text-sm text-muted-foreground">{user.bio}</p>
                    </div>
                  </>
                )}

                <Separator className="my-4" />

                {/* Actions */}
                <div className="space-y-2">
                  {onMessage && (
                    <Button
                      className="w-full"
                      onClick={() => {
                        onMessage(user._id);
                        onClose();
                      }}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2">
                    {onAddFriend && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onAddFriend(user._id);
                          onClose();
                        }}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </Button>
                    )}
                    
                    {onBlock && (
                      <Button
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          onBlock(user._id);
                          onClose();
                        }}
                      >
                        <Ban className="h-4 w-4 mr-2" />
                        Block
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

