'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Clock, Users, RefreshCw, Trophy, Lock, Trash2, AlertTriangle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { VoteOptionComponent } from './vote-option';
import { cn } from '@/lib/utils';
import { Vote } from '@/types';

interface VoteMessageProps {
  vote: Vote;
  currentUserId: string;
  currentUserRole?: 'admin' | 'moderator' | 'member';
  users: Map<string, { _id: string; username: string; avatar_url?: string }>;
  onVote: (voteId: string, optionIndex: number) => Promise<void>;
  onVoteUpdated?: (vote: Vote) => void;
  onDelete?: (voteId: string) => Promise<void>;
}

export function VoteMessage({
  vote,
  currentUserId,
  currentUserRole = 'member',
  users,
  onVote,
  onDelete,
}: VoteMessageProps) {
  const [isVoting, setIsVoting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(!vote.is_active);

  // Calculate user's selected options
  useEffect(() => {
    const userSelections: number[] = [];
    vote.options.forEach((option, index) => {
      if (option.voters.includes(currentUserId)) {
        userSelections.push(index);
      }
    });
    setSelectedOptions(userSelections);
  }, [vote.options, currentUserId]);

  // Countdown timer
  const updateTimeLeft = useCallback(() => {
    if (!vote.expires_at) {
      setTimeLeft('');
      return;
    }

    const now = new Date().getTime();
    const expiry = new Date(vote.expires_at).getTime();
    const diff = expiry - now;

    if (diff <= 0) {
      setIsExpired(true);
      setTimeLeft('Ended');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      setTimeLeft(`${days}d ${hours}h`);
    } else if (hours > 0) {
      setTimeLeft(`${hours}h ${minutes}m`);
    } else if (minutes > 0) {
      setTimeLeft(`${minutes}m ${seconds}s`);
    } else {
      setTimeLeft(`${seconds}s`);
    }
  }, [vote.expires_at]);

  useEffect(() => {
    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [updateTimeLeft]);

  // Check if expired based on state or date
  useEffect(() => {
    if (!vote.is_active) {
      setIsExpired(true);
    }
  }, [vote.is_active]);

  const totalVotes = vote.options.reduce((sum, opt) => sum + opt.voters.length, 0);
  const hasVoted = selectedOptions.length > 0;
  const showResults = hasVoted || isExpired;

  // Check if current user can delete this vote
  const isCreator = vote.created_by?._id === currentUserId || vote.created_by === currentUserId;
  const canDelete = isCreator || currentUserRole === 'admin' || currentUserRole === 'moderator';

  // Find winner (highest votes)
  const maxVotes = Math.max(...vote.options.map((opt) => opt.voters.length));
  const winnerIndices = vote.options
    .map((opt, i) => (opt.voters.length === maxVotes && maxVotes > 0 ? i : -1))
    .filter((i) => i >= 0);

  const handleVote = async (optionIndex: number) => {
    if (isVoting || isExpired) return;

    setIsVoting(true);
    try {
      await onVote(vote._id, optionIndex);
    } catch (error) {
      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || isDeleting) return;
    
    setIsDeleting(true);
    try {
      await onDelete(vote._id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Delete vote error:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const getVoterNames = (voters: string[]): string[] => {
    if (vote.settings.anonymous) return [];
    return voters
      .map((id) => {
        const user = users.get(id);
        return user?.username || 'Unknown';
      })
      .slice(0, 5);
  };

  const creator = users.get(vote.created_by?._id || '') || vote.created_by;

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'w-full rounded-lg border overflow-hidden',
        isExpired 
          ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50' 
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50 hover:border-[#615EF0]/30 dark:hover:border-[#615EF0]/30 transition-colors'
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-3 flex items-center gap-3 border-b',
        isExpired 
          ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700' 
          : 'bg-[#615EF0]/5 dark:bg-[#615EF0]/10 border-gray-200 dark:border-gray-700'
      )}>
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isExpired 
            ? 'bg-gray-200 dark:bg-gray-700' 
            : 'bg-[#615EF0]/10 dark:bg-[#615EF0]/20'
        )}>
          {isExpired ? (
            <Trophy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <BarChart3 className="w-4 h-4 text-[#615EF0]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6 rounded-lg">
              <AvatarImage src={creator?.avatar_url} />
              <AvatarFallback className="text-xs bg-gray-200 dark:bg-gray-700 rounded-lg">
                {creator?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {creator?.username || 'Unknown'}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">created a poll</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vote.settings.anonymous && (
            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              Anonymous
            </div>
          )}
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              className="h-7 w-7 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
              title="Delete poll"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{vote.question}</h3>
        {vote.settings.allow_multiple && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiple choices allowed</p>
        )}
      </div>

      {/* Options */}
      <div className="p-4 space-y-2">
        <AnimatePresence mode="wait">
          {vote.options.map((option, index) => (
            <VoteOptionComponent
              key={index}
              text={option.text}
              voteCount={option.voters.length}
              totalVotes={totalVotes}
              isSelected={selectedOptions.includes(index)}
              isWinner={isExpired && winnerIndices.includes(index)}
              disabled={isVoting || isExpired}
              showResults={showResults}
              anonymous={vote.settings.anonymous}
              voterNames={getVoterNames(option.voters)}
              onClick={() => handleVote(index)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
          {timeLeft && (
            <span className={cn(
              'flex items-center gap-1',
              isExpired ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            )}>
              <Clock className="w-4 h-4" />
              {timeLeft}
            </span>
          )}
        </div>

        {hasVoted && !isExpired && (
          <button
            onClick={() => {/* Could implement change vote */}}
            className="text-xs text-[#615EF0] hover:text-[#5048D9] dark:text-[#615EF0] dark:hover:text-[#7C73F0] font-medium flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Change vote
          </button>
        )}
      </div>

      {/* Loading overlay */}
      <AnimatePresence>
        {isVoting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-[#615EF0] border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl border border-gray-200 dark:border-gray-700"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Delete Poll?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
                This will permanently delete the poll and all votes. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
