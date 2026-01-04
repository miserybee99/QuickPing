'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Deadline, Conversation } from '@/types';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface UpcomingDeadlinesProps {
    onSelectConversation?: (conversationId: string) => void;
}


interface DeadlineWithConversation extends Deadline {
    conversation_id: Conversation | string;
}

function getConversationName(conversation: Conversation | string): string {
    if (typeof conversation === 'string') return 'Nhóm';
    return conversation.name || 'Nhóm';
}

function getConversationId(conversation: Conversation | string): string {
    if (typeof conversation === 'string') return conversation;
    return conversation._id;
}

function groupDeadlinesByDate(deadlines: DeadlineWithConversation[]): {
    today: DeadlineWithConversation[];
    tomorrow: DeadlineWithConversation[];
    thisWeek: DeadlineWithConversation[];
    later: DeadlineWithConversation[];
} {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfterTomorrow = new Date(now);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const result = {
        today: [] as DeadlineWithConversation[],
        tomorrow: [] as DeadlineWithConversation[],
        thisWeek: [] as DeadlineWithConversation[],
        later: [] as DeadlineWithConversation[],
    };

    deadlines.forEach(deadline => {
        const dueDate = new Date(deadline.due_date);
        dueDate.setHours(0, 0, 0, 0);

        if (dueDate.getTime() === now.getTime()) {
            result.today.push(deadline);
        } else if (dueDate.getTime() === tomorrow.getTime()) {
            result.tomorrow.push(deadline);
        } else if (dueDate < weekEnd) {
            result.thisWeek.push(deadline);
        } else {
            result.later.push(deadline);
        }
    });

    return result;
}

function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
    });
}

export function UpcomingDeadlines({ onSelectConversation }: UpcomingDeadlinesProps) {
    const [deadlines, setDeadlines] = useState<DeadlineWithConversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        fetchUpcoming();
    }, []);

    const fetchUpcoming = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await apiClient.deadlines.getUpcoming();
            setDeadlines(response.data.deadlines || []);
        } catch (err: any) {
            console.error('Error fetching upcoming deadlines:', err);
            setError('Unable to load deadlines');
        } finally {
            setLoading(false);
        }
    };

    const handleDeadlineClick = (deadline: DeadlineWithConversation) => {
        const conversationId = getConversationId(deadline.conversation_id);
        if (onSelectConversation) {
            onSelectConversation(conversationId);
        } else {
            router.push(`/?conversation=${conversationId}`);
        }
    };

    const grouped = groupDeadlinesByDate(deadlines);
    const hasDeadlines = deadlines.length > 0;

    if (loading) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-[#615EF0]" />
                        Upcoming Deadlines
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-6 w-6 animate-spin text-[#615EF0]" />
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="w-full">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-4 w-4 text-[#615EF0]" />
                        Upcoming Deadlines
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground text-center py-4">{error}</p>
                    <Button variant="outline" size="sm" onClick={fetchUpcoming} className="w-full">
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Calendar className="h-4 w-4 text-[#615EF0]" />
                    Upcoming Deadlines
                    {hasDeadlines && (
                        <Badge variant="secondary" className="ml-auto">
                            {deadlines.length}
                        </Badge>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!hasDeadlines ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No upcoming deadlines
                    </p>
                ) : (
                    <>
                        {/* Today */}
                        {grouped.today.length > 0 && (
                            <DeadlineGroup
                                title="Today"
                                deadlines={grouped.today}
                                onDeadlineClick={handleDeadlineClick}
                                urgent
                            />
                        )}

                        {/* Tomorrow */}
                        {grouped.tomorrow.length > 0 && (
                            <DeadlineGroup
                                title="Tomorrow"
                                deadlines={grouped.tomorrow}
                                onDeadlineClick={handleDeadlineClick}
                            />
                        )}

                        {/* This Week */}
                        {grouped.thisWeek.length > 0 && (
                            <DeadlineGroup
                                title="This Week"
                                deadlines={grouped.thisWeek}
                                onDeadlineClick={handleDeadlineClick}
                            />
                        )}

                        {/* Later */}
                        {grouped.later.length > 0 && (
                            <DeadlineGroup
                                title="Later"
                                deadlines={grouped.later}
                                onDeadlineClick={handleDeadlineClick}
                            />
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

interface DeadlineGroupProps {
    title: string;
    deadlines: DeadlineWithConversation[];
    onDeadlineClick: (deadline: DeadlineWithConversation) => void;
    urgent?: boolean;
}

function DeadlineGroup({ title, deadlines, onDeadlineClick, urgent }: DeadlineGroupProps) {
    return (
        <div>
            <h4 className={cn(
                "text-xs font-semibold uppercase tracking-wider mb-2",
                urgent ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
            )}>
                {title}
            </h4>
            <div className="space-y-2">
                {deadlines.map(deadline => (
                    <div
                        key={deadline._id}
                        onClick={() => onDeadlineClick(deadline)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 cursor-pointer transition-colors group"
                    >
                        {/* Deadline indicator dot */}
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-primary" />

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{deadline.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{getConversationName(deadline.conversation_id)}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDate(deadline.due_date)}</span>
                                </div>
                            </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                ))}
            </div>
        </div>
    );
}
