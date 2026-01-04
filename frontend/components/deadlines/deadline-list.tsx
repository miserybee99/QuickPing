'use client';

import { useState } from 'react';
import { Calendar, Clock, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Deadline } from '@/types';
import { cn } from '@/lib/utils';

interface DeadlineListProps {
    deadlines: Deadline[];
    onDeadlineClick?: (deadline: Deadline) => void;
    onEdit?: (deadline: Deadline) => void;
    onDelete?: (deadline: Deadline) => void;
    isAdmin?: boolean;
    loading?: boolean;
}


function formatDate(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
}

function getDaysUntil(date: Date | string): string {
    const d = new Date(date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);

    const diff = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return `Overdue ${Math.abs(diff)} day${Math.abs(diff) > 1 ? 's' : ''}`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 7) return `${diff} day${diff > 1 ? 's' : ''} left`;
    return formatDate(date);
}

export function DeadlineList({
    deadlines,
    onDeadlineClick,
    onEdit,
    onDelete,
    isAdmin = false,
    loading = false,
}: DeadlineListProps) {
    const filteredDeadlines = deadlines;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Deadline list */}
            <div className="flex-1 overflow-auto space-y-2">
                {filteredDeadlines.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        No deadlines
                    </div>
                ) : (
                    filteredDeadlines.map(deadline => (
                        <div
                            key={deadline._id}
                            onClick={() => onDeadlineClick?.(deadline)}
                            className={cn(
                                "p-3 rounded-lg border cursor-pointer transition-colors",
                                "hover:bg-accent/50",
                            )}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-sm truncate">{deadline.title}</h4>
                                    {deadline.description && (
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                            {deadline.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mt-2">
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            <span>{getDaysUntil(deadline.due_date)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions - Admin only */}
                                {isAdmin && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => {
                                                e.stopPropagation();
                                                onEdit?.(deadline);
                                            }}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDelete?.(deadline);
                                                }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
