'use client';

import { motion } from 'framer-motion';
import { Trophy, Users, Lock, Calendar } from 'lucide-react';
import { VoteOptionComponent } from './vote-option';
import { Vote } from '@/types';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface VoteResultsProps {
  vote: Vote;
  users: Map<string, { _id: string; username: string; avatar_url?: string }>;
}

export function VoteResults({ vote, users }: VoteResultsProps) {
  const totalVotes = vote.options.reduce((sum, opt) => sum + opt.voters.length, 0);
  
  // Find winner(s)
  const maxVotes = Math.max(...vote.options.map((opt) => opt.voters.length));
  const winners = vote.options
    .map((opt, i) => ({ option: opt, index: i }))
    .filter((item) => item.option.voters.length === maxVotes && maxVotes > 0);

  const getVoterNames = (voters: string[]): string[] => {
    if (vote.settings.anonymous) return [];
    return voters
      .map((id) => {
        const user = users.get(id);
        return user?.username || 'Unknown';
      })
      .slice(0, 5);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md rounded-2xl border-2 border-gray-200 bg-white overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Vote Results</h3>
            <p className="text-xs text-gray-500">Voting has ended</p>
          </div>
          {vote.settings.anonymous && (
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              <Lock className="w-3 h-3" />
              Anonymous
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="font-medium text-gray-900">{vote.question}</h4>
      </div>

      {/* Winner Highlight */}
      {winners.length > 0 && (
        <div className="px-4 py-3 bg-green-50 border-b border-green-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              {winners.length === 1 ? 'Winner:' : 'Tied:'}{' '}
              {winners.map((w) => w.option.text).join(', ')}
            </span>
            <span className="text-xs text-green-600 ml-auto">
              {maxVotes} {maxVotes === 1 ? 'vote' : 'votes'}
            </span>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="p-4 space-y-2">
        {vote.options
          .map((option, index) => ({ option, index }))
          .sort((a, b) => b.option.voters.length - a.option.voters.length)
          .map(({ option, index }) => (
            <VoteOptionComponent
              key={index}
              text={option.text}
              voteCount={option.voters.length}
              totalVotes={totalVotes}
              isSelected={false}
              isWinner={option.voters.length === maxVotes && maxVotes > 0}
              disabled={true}
              showResults={true}
              anonymous={vote.settings.anonymous}
              voterNames={getVoterNames(option.voters)}
            />
          ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
        <span className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          {totalVotes} voted
        </span>
        {vote.expires_at && (
          <span className="flex items-center gap-1 text-xs">
            <Calendar className="w-3 h-3" />
            Ended {format(new Date(vote.expires_at), 'HH:mm MM/dd', { locale: enUS })}
          </span>
        )}
      </div>
    </motion.div>
  );
}
