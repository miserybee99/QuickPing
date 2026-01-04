'use client';

import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import apiClient from '@/lib/api-client';

interface CreateDeadlineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    conversationId: string;
    onSuccess?: () => void;
}

export function CreateDeadlineModal({
    open,
    onOpenChange,
    conversationId,
    onSuccess,
}: CreateDeadlineModalProps) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setDueDate('');
        setError('');
    };

    const handleClose = () => {
        resetForm();
        onOpenChange(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Please enter a title');
            return;
        }

        if (!dueDate) {
            setError('Please select a due date');
            return;
        }

        // Check if due date is in the future
        const selectedDate = new Date(dueDate);
        if (selectedDate <= new Date()) {
            setError('Due date must be in the future');
            return;
        }

        setLoading(true);

        try {
            await apiClient.deadlines.create({
                conversation_id: conversationId,
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: new Date(dueDate).toISOString(),
            });

            onSuccess?.();
            handleClose();
        } catch (err: any) {
            console.error('Create deadline error:', err);
            setError(err.response?.data?.error || 'Unable to create deadline');
        } finally {
            setLoading(false);
        }
    };

    // Get tomorrow's date as minimum date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Create New Deadline
                    </DialogTitle>
                    <DialogDescription>
                        Create a deadline for the group. Only admins can create deadlines.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Title */}
                        <div className="grid gap-2">
                            <Label htmlFor="title">Title *</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Submit assignment..."
                                maxLength={200}
                                disabled={loading}
                            />
                        </div>

                        {/* Description */}
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Details about the deadline..."
                                maxLength={1000}
                                rows={3}
                                disabled={loading}
                            />
                        </div>

                        {/* Due date */}
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date *</Label>
                            <Input
                                id="dueDate"
                                type="datetime-local"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                min={minDate}
                                disabled={loading}
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Deadline
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
