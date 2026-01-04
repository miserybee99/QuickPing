'use client';

import { Calendar, Clock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Deadline, User as UserType } from '@/types';
import { cn } from '@/lib/utils';

interface DeadlineCardProps {
    deadline: Deadline;
    onClick?: () => void;
    showConversation?: boolean;
}


function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getDaysUntil(date: Date | string): { text: string; isUrgent: boolean; isOverdue: boolean } {
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return { text: `Overdue ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`, isUrgent: true, isOverdue: true };
    if (diff === 0) return { text: 'Today', isUrgent: true, isOverdue: false };
    if (diff === 1) return { text: 'Tomorrow', isUrgent: true, isOverdue: false };
    if (diff <= 3) return { text: `${diff} day${diff > 1 ? 's' : ''} left`, isUrgent: true, isOverdue: false };
    if (diff <= 7) return { text: `${diff} day${diff > 1 ? 's' : ''} left`, isUrgent: false, isOverdue: false };
    return { text: formatDate(date), isUrgent: false, isOverdue: false };
}

function getCreatorName(creator: string | UserType): string {
    if (typeof creator === 'string') return 'Unknown';
    return creator.username || 'Unknown';
}

function getConversationName(conversation: any): string {
    if (typeof conversation === 'string') return '';
    return conversation?.name || 'Nhóm';
}

export function DeadlineCard({
    deadline,
    onClick,
    showConversation = false,
}: DeadlineCardProps) {
    const daysInfo = getDaysUntil(deadline.due_date);

    return (
        <Card
            onClick={onClick}
            className="cursor-pointer transition-all hover:shadow-md"
        >
            <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        {/* Title */}
                        <h4 className="font-medium text-sm truncate">
                            {deadline.title}
                        </h4>

                        {/* Description */}
                        {deadline.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {deadline.description}
                            </p>
                        )}

                        {/* Conversation name (for homepage) */}
                        {showConversation && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span className="truncate">{getConversationName(deadline.conversation_id)}</span>
                            </div>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center flex-wrap gap-2 mt-2">
                            {/* Due date */}
                            <div className={cn(
                                "flex items-center gap-1 text-xs",
                                daysInfo.isOverdue && "text-red-600 dark:text-red-400",
                                daysInfo.isUrgent && !daysInfo.isOverdue && "text-orange-600 dark:text-orange-400",
                                !daysInfo.isUrgent && "text-muted-foreground"
                            )}>
                                <Clock className="h-3 w-3" />
                                <span>{daysInfo.text}</span>
                            </div>

                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
