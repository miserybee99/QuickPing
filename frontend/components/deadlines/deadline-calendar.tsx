'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Deadline } from '@/types';
import { cn } from '@/lib/utils';

interface DeadlineCalendarProps {
    deadlines: Deadline[];
    onDateClick?: (date: Date, deadlines: Deadline[]) => void;
    onDeadlineClick?: (deadline: Deadline) => void;
    onCreateClick?: () => void;
    isAdmin?: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];


export function DeadlineCalendar({
    deadlines,
    onDateClick,
    onDeadlineClick,
    onCreateClick,
    isAdmin = false,
}: DeadlineCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get calendar days for current month
    const calendarDays = useMemo(() => {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDay = firstDay.getDay();

        const days: (number | null)[] = [];

        // Add empty cells for days before first of month
        for (let i = 0; i < startDay; i++) {
            days.push(null);
        }

        // Add days of month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    }, [year, month]);

    // Map deadlines to dates
    const deadlinesByDate = useMemo(() => {
        const map = new Map<string, Deadline[]>();

        deadlines.forEach(deadline => {
            const dueDate = new Date(deadline.due_date);
            const key = `${dueDate.getFullYear()}-${dueDate.getMonth()}-${dueDate.getDate()}`;
            const existing = map.get(key) || [];
            map.set(key, [...existing, deadline]);
        });

        return map;
    }, [deadlines]);

    const getDeadlinesForDay = (day: number): Deadline[] => {
        const key = `${year}-${month}-${day}`;
        return deadlinesByDate.get(key) || [];
    };

    const goToPrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const today = new Date();
    const isToday = (day: number) =>
        year === today.getFullYear() &&
        month === today.getMonth() &&
        day === today.getDate();

    const handleDayClick = (day: number) => {
        const date = new Date(year, month, day);
        const dayDeadlines = getDeadlinesForDay(day);
        onDateClick?.(date, dayDeadlines);
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={goToPrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="font-semibold text-sm min-w-[120px] text-center">
                        {MONTHS[month]} {year}
                    </h3>
                    <Button variant="ghost" size="icon" onClick={goToNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                        Today
                    </Button>
                    {isAdmin && onCreateClick && (
                        <Button size="sm" onClick={onCreateClick}>
                            <Plus className="h-4 w-4 mr-1" />
                            Create
                        </Button>
                    )}
                </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS.map(day => (
                    <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1 flex-1">
                {calendarDays.map((day, index) => {
                    if (day === null) {
                        return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dayDeadlines = getDeadlinesForDay(day);
                    const hasDeadlines = dayDeadlines.length > 0;

                    return (
                        <div
                            key={day}
                            onClick={() => handleDayClick(day)}
                            className={cn(
                                "aspect-square p-1 rounded-md cursor-pointer transition-colors",
                                "hover:bg-accent/50 border border-transparent",
                                isToday(day) && "bg-primary/10 border-primary",
                                hasDeadlines && "ring-1 ring-inset ring-muted-foreground/20"
                            )}
                        >
                            <div className="flex flex-col h-full">
                                <span className={cn(
                                    "text-xs font-medium",
                                    isToday(day) && "text-primary"
                                )}>
                                    {day}
                                </span>

                                {/* Deadline indicators */}
                                {hasDeadlines && (
                                    <div className="flex flex-wrap gap-0.5 mt-auto">
                                        {dayDeadlines.slice(0, 3).map((deadline, i) => (
                                            <div
                                                key={deadline._id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onDeadlineClick?.(deadline);
                                                }}
                                                className="w-2 h-2 rounded-full cursor-pointer bg-primary"
                                                title={deadline.title}
                                            />
                                        ))}
                                        {dayDeadlines.length > 3 && (
                                            <Badge variant="secondary" className="text-[8px] px-1 h-3">
                                                +{dayDeadlines.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
