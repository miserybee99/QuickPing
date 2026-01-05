'use client';

import { motion } from 'framer-motion';
import { Check, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoteOptionProps {
  text: string;
  voteCount: number;
  totalVotes: number;
  isSelected: boolean;
  isWinner?: boolean;
  disabled?: boolean;
  showResults: boolean;
  anonymous?: boolean;
  voterNames?: string[];
  onClick?: () => void;
}

export function VoteOptionComponent({
  text,
  voteCount,
  totalVotes,
  isSelected,
  isWinner = false,
  disabled = false,
  showResults,
  anonymous = false,
  voterNames = [],
  onClick,
}: VoteOptionProps) {
  const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.01 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all relative overflow-hidden group',
        isSelected
          ? 'border-[#615EF0] bg-[#615EF0]/5 dark:bg-[#615EF0]/10'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
        isWinner && 'border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20',
        disabled && 'cursor-default opacity-80'
      )}
    >
      {/* Progress bar background */}
      {showResults && (
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0 rounded-l-lg',
            isWinner
              ? 'bg-green-500/20 dark:bg-green-400/20'
              : isSelected
              ? 'bg-[#615EF0]/15 dark:bg-[#615EF0]/20'
              : 'bg-gray-200/50 dark:bg-gray-700/50'
          )}
        />
      )}

      <div className="relative flex items-center gap-3">
        {/* Radio/Check indicator */}
        <div
          className={cn(
            'w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors',
            isSelected
              ? 'border-[#615EF0] bg-[#615EF0]'
              : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
          )}
        >
          {isSelected && <Check className="w-3 h-3 text-white" />}
        </div>

        {/* Option text */}
        <span className={cn(
          'flex-1 text-sm font-medium',
          isSelected 
            ? 'text-gray-900 dark:text-gray-100' 
            : 'text-gray-700 dark:text-gray-300'
        )}>
          {text}
        </span>

        {/* Vote count and percentage */}
        {showResults && (
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(
              'font-semibold',
              isWinner 
                ? 'text-green-600 dark:text-green-400' 
                : isSelected 
                ? 'text-[#615EF0]' 
                : 'text-gray-600 dark:text-gray-400'
            )}>
              {percentage}%
            </span>
            <span className="text-gray-400 dark:text-gray-500 text-xs">
              ({voteCount})
            </span>
          </div>
        )}
      </div>

      {/* Voters tooltip (non-anonymous) */}
      {showResults && !anonymous && voterNames.length > 0 && (
        <div className="relative mt-2 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Users className="w-3 h-3" />
          <span className="truncate">
            {voterNames.slice(0, 3).join(', ')}
            {voterNames.length > 3 && ` +${voterNames.length - 3} more`}
          </span>
        </div>
      )}
    </motion.button>
  );
}
