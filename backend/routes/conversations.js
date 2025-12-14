import express from 'express';
import { body, validationResult } from 'express-validator';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create or get direct conversation with another user
router.post('/direct', authenticate, async (req, res) => {
  try {
    const { userId } = req.body;
    const currentUserId = req.user._id;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Check if user exists
    const otherUser = await User.findById(userId);
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if conversation already exists
    const existingConversation = await Conversation.findOne({
      type: 'direct',
      'participants.user_id': { $all: [currentUserId, userId] },
      'participants': { $size: 2 }
    }).populate('participants.user_id', 'username email avatar_url is_online last_seen');

    if (existingConversation) {
      return res.json({ conversation: existingConversation });
    }

    // Create new direct conversation
    const newConversation = new Conversation({
      type: 'direct',
      participants: [
        { user_id: currentUserId, role: 'member' },
        { user_id: userId, role: 'member' }
      ],
      created_by: currentUserId
    });

    await newConversation.save();

    // Populate participants
    await newConversation.populate('participants.user_id', 'username email avatar_url is_online last_seen');

    res.status(201).json({ conversation: newConversation });
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all conversations for user
router.get('/', authenticate, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user_id': req.user._id
    })
    .populate('participants.user_id', 'username avatar_url is_online last_seen')
    .populate('last_message')
    .populate('created_by', 'username avatar_url')
    .sort({ updated_at: -1 });

    res.json({ conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single conversation
router.get('/:conversationId', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId)
      .populate('participants.user_id', 'username avatar_url is_online last_seen role')
      .populate('created_by', 'username avatar_url')
      .populate('pinned_messages');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is participant
    const isParticipant = conversation.participants.some(
      p => p.user_id._id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ conversation });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create direct conversation (1-on-1)
router.post('/direct', authenticate, [
  body('other_user_id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { other_user_id } = req.body;

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      type: 'direct',
      participants: {
        $all: [
          { $elemMatch: { user_id: req.user._id } },
          { $elemMatch: { user_id: other_user_id } }
        ]
      },
      $expr: { $eq: [{ $size: '$participants' }, 2] }
    })
    .populate('participants.user_id', 'username avatar_url');

    if (conversation) {
      return res.json({ conversation });
    }

    // Create new conversation
    conversation = new Conversation({
      type: 'direct',
      participants: [
        { user_id: req.user._id, role: 'member' },
        { user_id: other_user_id, role: 'member' }
      ],
      created_by: req.user._id
    });

    await conversation.save();
    await conversation.populate('participants.user_id', 'username avatar_url is_online');

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create direct conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create group conversation
router.post('/group', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('participants').isArray().isLength({ min: 1 }),
  body('participants.*').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, participants } = req.body;

    // Add creator as admin
    const allParticipants = [
      { user_id: req.user._id, role: 'admin' },
      ...participants.map(id => ({ user_id: id, role: 'member' }))
    ];

    const conversation = new Conversation({
      type: 'group',
      name,
      description,
      participants: allParticipants,
      created_by: req.user._id
    });

    await conversation.save();
    await conversation.populate('participants.user_id', 'username avatar_url');

    res.status(201).json({ conversation });
  } catch (error) {
    console.error('Create group conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update group (name, description, add/remove participants)
router.put('/:conversationId', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is admin or moderator
    const participant = conversation.participants.find(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!participant || !['admin', 'moderator'].includes(participant.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { name, description, avatar_url, participants } = req.body;

    if (name) conversation.name = name;
    if (description !== undefined) conversation.description = description;
    if (avatar_url !== undefined) conversation.avatar_url = avatar_url;
    if (participants) {
      conversation.participants = participants;
    }

    await conversation.save();
    await conversation.populate('participants.user_id', 'username avatar_url');

    res.json({ conversation });
  } catch (error) {
    console.error('Update conversation error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Pin message
router.post('/:conversationId/pin', authenticate, [
  body('message_id').isMongoId()
], async (req, res) => {
  try {
    const { message_id } = req.body;
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const participant = conversation.participants.find(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    if (!conversation.pinned_messages.includes(message_id)) {
      conversation.pinned_messages.push(message_id);
      await conversation.save();
    }

    res.json({ message: 'Message pinned' });
  } catch (error) {
    console.error('Pin message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Unpin message
router.delete('/:conversationId/pin/:messageId', authenticate, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    conversation.pinned_messages = conversation.pinned_messages.filter(
      id => id.toString() !== req.params.messageId
    );
    await conversation.save();

    res.json({ message: 'Message unpinned' });
  } catch (error) {
    console.error('Unpin message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Change participant role (promote/demote)
router.put('/:conversationId/participants/:userId/role', authenticate, [
  body('role').isIn(['admin', 'moderator', 'member'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversationId, userId } = req.params;
    const { role } = req.body;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Can only change roles in group conversations' });
    }

    // Check if current user has permission (must be admin)
    const currentParticipant = conversation.participants.find(
      p => p.user_id.toString() === currentUserId.toString()
    );

    if (!currentParticipant || currentParticipant.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can change roles' });
    }

    // Find the participant to change role
    const targetParticipant = conversation.participants.find(
      p => p.user_id.toString() === userId
    );

    if (!targetParticipant) {
      return res.status(404).json({ error: 'User is not a participant in this conversation' });
    }

    // Prevent changing own role
    if (userId === currentUserId.toString()) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    // Prevent demoting the last admin
    if (targetParticipant.role === 'admin' && role !== 'admin') {
      const adminCount = conversation.participants.filter(p => p.role === 'admin').length;
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Promote another admin first.' });
      }
    }

    // Update role
    targetParticipant.role = role;
    await conversation.save();

    // Populate and return updated conversation
    await conversation.populate('participants.user_id', 'username avatar_url is_online last_seen role');
    await conversation.populate('created_by', 'username avatar_url');

    // Emit socket event to notify all participants about the role change
    const io = req.app.get('io');
    if (io) {
      // Emit to all participants in the conversation
      conversation.participants.forEach(p => {
        io.to(`user_${p.user_id._id}`).emit('conversation_updated', {
          conversation,
          type: 'role_change',
          userId: userId,
          newRole: role
        });
      });
    }

    res.json({ 
      conversation,
      message: `User role changed to ${role}` 
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove participant from group
router.delete('/:conversationId/participants/:userId', authenticate, async (req, res) => {
  try {
    const { conversationId, userId } = req.params;
    const currentUserId = req.user._id;

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Can only remove participants from group conversations' });
    }

    // Check if user is trying to remove themselves (leave group)
    const isSelf = userId === currentUserId.toString();

    if (!isSelf) {
      // Check if current user has permission (admin or moderator)
      const currentParticipant = conversation.participants.find(
        p => p.user_id.toString() === currentUserId.toString()
      );

      if (!currentParticipant || !['admin', 'moderator'].includes(currentParticipant.role)) {
        return res.status(403).json({ error: 'Only admins and moderators can remove members' });
      }

      // Prevent removing the last admin
      const targetParticipant = conversation.participants.find(
        p => p.user_id.toString() === userId
      );

      if (targetParticipant && targetParticipant.role === 'admin') {
        const adminCount = conversation.participants.filter(p => p.role === 'admin').length;
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin' });
        }
      }
    }

    // Remove participant
    conversation.participants = conversation.participants.filter(
      p => p.user_id.toString() !== userId
    );

    await conversation.save();

    // Populate and return updated conversation
    await conversation.populate('participants.user_id', 'username avatar_url is_online last_seen role');
    await conversation.populate('created_by', 'username avatar_url');

    res.json({ 
      conversation,
      message: isSelf ? 'Left group successfully' : 'Participant removed successfully'
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

