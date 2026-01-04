import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import Deadline from '../models/Deadline.js';
import Conversation from '../models/Conversation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// ==========================================================================
// HELPER FUNCTIONS
// ==========================================================================

/**
 * Check if user is admin of the conversation
 */
async function isAdmin(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { ok: false, error: 'Conversation not found', status: 404 };

    const participant = conversation.participants.find(
        p => p.user_id.toString() === userId.toString()
    );

    if (!participant) return { ok: false, error: 'Not a participant', status: 403 };
    if (participant.role !== 'admin') return { ok: false, error: 'Only admin can perform this action', status: 403 };

    return { ok: true, conversation };
}

/**
 * Check if user is participant of the conversation
 */
async function isParticipant(conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { ok: false, error: 'Conversation not found', status: 404 };

    const participant = conversation.participants.find(
        p => p.user_id.toString() === userId.toString()
    );

    if (!participant) return { ok: false, error: 'Not a participant', status: 403 };

    return { ok: true, conversation, participant };
}

/**
 * Check if user is admin OR creator of the deadline
 */
async function isAdminOrCreator(deadline, conversationId, userId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return { ok: false, error: 'Conversation not found', status: 404 };

    const participant = conversation.participants.find(
        p => p.user_id.toString() === userId.toString()
    );

    if (!participant) return { ok: false, error: 'Not a participant', status: 403 };

    const isCreator = deadline.created_by.toString() === userId.toString();
    const isConvAdmin = participant.role === 'admin';

    if (!isCreator && !isConvAdmin) {
        return { ok: false, error: 'Only admin or creator can perform this action', status: 403 };
    }

    return { ok: true, conversation, isCreator, isAdmin: isConvAdmin };
}

// ==========================================================================
// ROUTES
// ==========================================================================

/**
 * POST /api/deadlines
 * Create a new deadline (admin only)
 */
router.post('/', authenticate, [
    body('conversation_id').isMongoId().withMessage('Invalid conversation ID'),
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
    body('due_date').isISO8601().withMessage('Valid due date is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { conversation_id, title, description, due_date } = req.body;

        // Check if user is admin
        const adminCheck = await isAdmin(conversation_id, req.user._id);
        if (!adminCheck.ok) {
            return res.status(adminCheck.status).json({ error: adminCheck.error });
        }

        // Validate due_date is in the future (optional - can be relaxed)
        const dueDate = new Date(due_date);
        if (dueDate < new Date()) {
            return res.status(400).json({ error: 'Due date must be in the future' });
        }

        const deadline = new Deadline({
            conversation_id,
            created_by: req.user._id,
            title,
            description: description || '',
            due_date: dueDate
        });

        await deadline.save();
        await deadline.populate('created_by', 'username avatar_url');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation_${conversation_id}`).emit('deadline_created', {
                conversation_id: conversation_id.toString(),
                deadline: deadline.toObject()
            });
        }

        res.status(201).json({ deadline });
    } catch (error) {
        console.error('Create deadline error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/deadlines/conversation/:conversationId
 * Get all deadlines for a conversation (any participant)
 */
router.get('/conversation/:conversationId', authenticate, [
    param('conversationId').isMongoId().withMessage('Invalid conversation ID'),
    query('sort').optional().isIn(['due_date', '-due_date'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { conversationId } = req.params;
        const { sort } = req.query;

        // Check if user is participant
        const participantCheck = await isParticipant(conversationId, req.user._id);
        if (!participantCheck.ok) {
            return res.status(participantCheck.status).json({ error: participantCheck.error });
        }

        // Build query
        const queryFilter = { conversation_id: conversationId };

        // Build sort
        let sortOption = { due_date: 1 }; // Default: ascending
        if (sort === '-due_date') sortOption = { due_date: -1 };

        const deadlines = await Deadline.find(queryFilter)
            .populate('created_by', 'username avatar_url')
            .sort(sortOption);

        res.json({ deadlines });
    } catch (error) {
        console.error('Get deadlines error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/deadlines/user
 * Get all deadlines for current user across all conversations
 */
router.get('/user', authenticate, async (req, res) => {
    try {
        // Get all conversations user participates in
        const conversations = await Conversation.find({
            'participants.user_id': req.user._id
        }).select('_id');

        const conversationIds = conversations.map(c => c._id);

        // Get deadlines from today onwards
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlines = await Deadline.find({
            conversation_id: { $in: conversationIds },
            due_date: { $gte: today }
        })
            .populate('conversation_id', 'name avatar_url type')
            .populate('created_by', 'username avatar_url')
            .sort({ due_date: 1 });

        res.json({ deadlines });
    } catch (error) {
        console.error('Get user deadlines error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * GET /api/deadlines/upcoming
 * Get 20 most urgent deadlines for homepage
 */
router.get('/upcoming', authenticate, async (req, res) => {
    try {
        // Get all conversations user participates in
        const conversations = await Conversation.find({
            'participants.user_id': req.user._id
        }).select('_id');

        const conversationIds = conversations.map(c => c._id);

        // Get deadlines, limit to 20 most urgent
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const deadlines = await Deadline.find({
            conversation_id: { $in: conversationIds },
            due_date: { $gte: today }
        })
            .populate('conversation_id', 'name avatar_url type')
            .populate('created_by', 'username avatar_url')
            .sort({ due_date: 1 })
            .limit(20);

        res.json({ deadlines });
    } catch (error) {
        console.error('Get upcoming deadlines error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * PUT /api/deadlines/:deadlineId
 * Update a deadline (admin or creator only)
 */
router.put('/:deadlineId', authenticate, [
    param('deadlineId').isMongoId().withMessage('Invalid deadline ID'),
    body('title').optional().trim().isLength({ min: 1, max: 200 }),
    body('description').optional().trim().isLength({ max: 1000 }),
    body('due_date').optional().isISO8601()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deadlineId } = req.params;
        const deadline = await Deadline.findById(deadlineId);

        if (!deadline) {
            return res.status(404).json({ error: 'Deadline not found' });
        }

        // Check authorization
        const authCheck = await isAdminOrCreator(deadline, deadline.conversation_id, req.user._id);
        if (!authCheck.ok) {
            return res.status(authCheck.status).json({ error: authCheck.error });
        }

        // Update fields
        const { title, description, due_date } = req.body;

        if (title !== undefined) deadline.title = title;
        if (description !== undefined) deadline.description = description;
        if (due_date !== undefined) deadline.due_date = new Date(due_date);

        await deadline.save();
        await deadline.populate('created_by', 'username avatar_url');

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation_${deadline.conversation_id}`).emit('deadline_updated', {
                conversation_id: deadline.conversation_id.toString(),
                deadline: deadline.toObject()
            });
        }

        res.json({ deadline });
    } catch (error) {
        console.error('Update deadline error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

/**
 * DELETE /api/deadlines/:deadlineId
 * Delete a deadline (admin or creator only)
 */
router.delete('/:deadlineId', authenticate, [
    param('deadlineId').isMongoId().withMessage('Invalid deadline ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { deadlineId } = req.params;
        const deadline = await Deadline.findById(deadlineId);

        if (!deadline) {
            return res.status(404).json({ error: 'Deadline not found' });
        }

        const conversationId = deadline.conversation_id;

        // Check authorization
        const authCheck = await isAdminOrCreator(deadline, conversationId, req.user._id);
        if (!authCheck.ok) {
            return res.status(authCheck.status).json({ error: authCheck.error });
        }

        await Deadline.findByIdAndDelete(deadlineId);

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(`conversation_${conversationId}`).emit('deadline_deleted', {
                conversation_id: conversationId.toString(),
                deadline_id: deadlineId
            });
        }

        res.json({ message: 'Deadline deleted successfully' });
    } catch (error) {
        console.error('Delete deadline error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
