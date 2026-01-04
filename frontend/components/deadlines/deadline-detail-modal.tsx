'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Loader2, Pencil, Trash2, User } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Deadline, User as UserType } from '@/types';
import apiClient from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface DeadlineDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deadline: Deadline | null;
    isAdmin?: boolean;
    onUpdate?: () => void;
    onDelete?: () => void;
}


function formatDateTime(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getCreatorName(creator: string | UserType): string {
    if (typeof creator === 'string') return 'Unknown';
    return creator.username || 'Unknown';
}

export function DeadlineDetailModal({
    open,
    onOpenChange,
    deadline,
    isAdmin = false,
    onUpdate,
    onDelete,
}: DeadlineDetailModalProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Edit form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [dueDate, setDueDate] = useState('');

    // Reset form when deadline changes
    useEffect(() => {
        if (deadline) {
            setTitle(deadline.title);
            setDescription(deadline.description || '');
            // Format date for datetime-local input
            const d = new Date(deadline.due_date);
            const localDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
            setDueDate(localDate.toISOString().slice(0, 16));
            setIsEditing(false);
            setError('');
        }
    }, [deadline]);

    const handleClose = () => {
        setIsEditing(false);
        setError('');
        onOpenChange(false);
    };

    const handleSave = async () => {
        if (!deadline) return;

        setError('');

        if (!title.trim()) {
            setError('Please enter a title');
            return;
        }

        if (!dueDate) {
            setError('Please select a due date');
            return;
        }

        setLoading(true);

        try {
            await apiClient.deadlines.update(deadline._id, {
                title: title.trim(),
                description: description.trim() || undefined,
                due_date: new Date(dueDate).toISOString(),
            });

            setIsEditing(false);
            onUpdate?.();
        } catch (err: any) {
            console.error('Update deadline error:', err);
            setError(err.response?.data?.error || 'Unable to update deadline');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deadline) return;

        setLoading(true);

        try {
            await apiClient.deadlines.delete(deadline._id);
            setShowDeleteConfirm(false);
            handleClose();
            onDelete?.();
        } catch (err: any) {
            console.error('Delete deadline error:', err);
            setError(err.response?.data?.error || 'Unable to delete deadline');
        } finally {
            setLoading(false);
        }
    };

    if (!deadline) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={handleClose}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Calendar className="h-5 w-5" />
                                {isEditing ? 'Edit Deadline' : 'Deadline Details'}
                            </span>
                            {isAdmin && !isEditing && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="text-destructive hover:text-destructive"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {isEditing ? (
                        // Edit mode
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-title">Title *</Label>
                                <Input
                                    id="edit-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    maxLength={200}
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    maxLength={1000}
                                    rows={3}
                                    disabled={loading}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="edit-dueDate">Due Date *</Label>
                                <Input
                                    id="edit-dueDate"
                                    type="datetime-local"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    disabled={loading}
                                />
                            </div>

                            {error && <p className="text-sm text-destructive">{error}</p>}
                        </div>
                    ) : (
                        // View mode
                        <div className="py-4 space-y-4">
                            <div>
                                <h3 className="font-semibold text-lg">{deadline.title}</h3>
                                {deadline.description && (
                                    <p className="text-muted-foreground mt-1">{deadline.description}</p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase">Due Date</p>
                                    <div className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        <span>{formatDateTime(deadline.due_date)}</span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs uppercase">Created By</p>
                                    <div className="flex items-center gap-1">
                                        <User className="h-4 w-4" />
                                        <span>{getCreatorName(deadline.created_by)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={() => setIsEditing(false)} disabled={loading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSave} disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" onClick={handleClose}>
                                Close
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete confirmation dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Deadline?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete deadline "{deadline.title}"? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
