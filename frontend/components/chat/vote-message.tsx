'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, Clock, Users, RefreshCw, Trophy, Lock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { VoteOptionComponent } from './vote-option';
import { cn } from '@/lib/utils';
import { Vote } from '@/types';

interface VoteMessageProps {
  vote: Vote;
  currentUserId: string;
  users: Map<string, { _id: string; username: string; avatar_url?: string }>;
  onVote: (voteId: string, optionIndex: number) => Promise<void>;
  onVoteUpdated?: (vote: Vote) => void;
}

export function VoteMessage({
  vote,
  currentUserId,
  users,
  onVote,
}: VoteMessageProps) {
  const [isVoting, setIsVoting] = useState(false);
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'w-full max-w-md rounded-2xl border-2 overflow-hidden',
        isExpired ? 'border-gray-200 bg-gray-50' : 'border-[#615EF0]/20 bg-white'
      )}
    >
      {/* Header */}
      <div className={cn(
        'px-4 py-3 flex items-center gap-3',
        isExpired ? 'bg-gray-100' : 'bg-[#615EF0]/5'
      )}>
        <div className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center',
          isExpired ? 'bg-gray-200' : 'bg-[#615EF0]/10'
        )}>
          {isExpired ? (
            <Trophy className="w-4 h-4 text-gray-500" />
          ) : (
            <BarChart3 className="w-4 h-4 text-[#615EF0]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={creator?.avatar_url} />
              <AvatarFallback className="text-[10px]">
                {creator?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-gray-700 truncate">
              {creator?.username || 'Unknown'}
            </span>
            <span className="text-xs text-gray-400">created a poll</span>
          </div>
        </div>
        {vote.settings.anonymous && (
          <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            <Lock className="w-3 h-3" />
            Anonymous
          </div>
        )}
      </div>

      {/* Question */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{vote.question}</h3>
        {vote.settings.allow_multiple && (
          <p className="text-xs text-gray-500 mt-1">Multiple choices allowed</p>
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
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
          </span>
          {timeLeft && (
            <span className={cn(
              'flex items-center gap-1',
              isExpired ? 'text-red-500' : 'text-gray-500'
            )}>
              <Clock className="w-4 h-4" />
              {timeLeft}
            </span>
          )}
        </div>

        {hasVoted && !isExpired && (
          <button
            onClick={() => {/* Could implement change vote */}}
            className="text-xs text-[#615EF0] hover:text-[#5048D9] font-medium flex items-center gap-1"
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
            className="absolute inset-0 bg-white/50 flex items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-6 h-6 border-2 border-[#615EF0] border-t-transparent rounded-full"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
