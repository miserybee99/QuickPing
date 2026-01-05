import express from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Vote from '../models/Vote.js';
import Conversation from '../models/Conversation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Create vote
router.post('/', authenticate, [
  body('conversation_id')
    .isMongoId()
    .withMessage('Invalid conversation ID format'),
  body('question')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Question is required and cannot be empty'),
  body('options')
    .isArray({ min: 2 })
    .withMessage('At least 2 options are required'),
  body('options.*')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Each option must not be empty')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => ({
        field: e.path || e.param,
        message: e.msg,
        value: e.value
      }));
      console.error('Create vote validation error:', {
        userId: req.user?._id,
        errors: errorMessages,
        body: req.body
      });
      // Ensure proper Content-Type header
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ 
        error: 'Validation failed',
        details: errorMessages,
        errors: errors.array() // Also include raw errors for compatibility
      });
    }

    const { conversation_id, question, options, settings, expires_at } = req.body;

    // Additional ObjectId validation as fallback
    if (!mongoose.Types.ObjectId.isValid(conversation_id)) {
      console.error('Create vote error: Invalid ObjectId format', {
        conversation_id,
        userId: req.user._id,
        conversationIdType: typeof conversation_id
      });
      return res.status(400).json({ 
        error: 'Invalid conversation ID format',
        details: [{ field: 'conversation_id', message: 'Conversation ID must be a valid MongoDB ObjectId' }]
      });
    }

    // Log the request for debugging
    console.log('Create vote request:', {
      userId: req.user._id,
      conversation_id,
      question: question?.substring(0, 50),
      optionsCount: options?.length
    });

    // Verify conversation and participation
    const conversation = await Conversation.findById(conversation_id);
    if (!conversation) {
      console.error('Create vote error: Conversation not found', {
        conversation_id,
        userId: req.user._id
      });
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      console.error('Create vote error: User is not a participant', {
        conversation_id,
        userId: req.user._id
      });
      return res.status(403).json({ error: 'Not a participant' });
    }

    // Validate and clean options
    const cleanedOptions = options
      .map(opt => typeof opt === 'string' ? opt.trim() : String(opt).trim())
      .filter(opt => opt.length > 0);

    if (cleanedOptions.length < 2) {
      console.error('Create vote error: Not enough valid options', {
        conversation_id,
        userId: req.user._id,
        optionsCount: cleanedOptions.length
      });
      return res.status(400).json({ 
        error: 'At least 2 valid options are required' 
      });
    }

    const vote = new Vote({
      conversation_id,
      created_by: req.user._id,
      question: question.trim(),
      options: cleanedOptions.map(text => ({ text, voters: [] })),
      settings: settings || {},
      expires_at: expires_at ? new Date(expires_at) : null,
      is_active: true
    });

    await vote.save();
    await vote.populate('created_by', 'username avatar_url');

    console.log('Vote created successfully:', {
      voteId: vote._id,
      conversation_id,
      userId: req.user._id
    });

    res.status(201).json({ vote });
  } catch (error) {
    console.error('Create vote error:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
      conversation_id: req.body?.conversation_id
    });
    res.status(500).json({ 
      error: 'Server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get votes for conversation
router.get('/conversation/:conversationId', authenticate, async (req, res) => {
  try {
    const votes = await Vote.find({
      conversation_id: req.params.conversationId,
      is_active: true
    })
    .populate('created_by', 'username avatar_url')
    .sort({ created_at: -1 });

    res.json({ votes });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Vote on option
router.post('/:voteId/vote', authenticate, [
  body('option_index').isInt({ min: 0 })
], async (req, res) => {
  try {
    const { option_index } = req.body;
    const vote = await Vote.findById(req.params.voteId);

    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    if (!vote.is_active) {
      return res.status(400).json({ error: 'Vote is not active' });
    }

    if (vote.expires_at && new Date() > vote.expires_at) {
      vote.is_active = false;
      await vote.save();
      return res.status(400).json({ error: 'Vote has expired' });
    }

    // Remove user from all options if not allowing multiple
    if (!vote.settings.allow_multiple) {
      vote.options.forEach(option => {
        option.voters = option.voters.filter(
          v => v.toString() !== req.user._id.toString()
        );
      });
    }

    // Add user to selected option if not already there
    if (vote.options[option_index]) {
      const alreadyVoted = vote.options[option_index].voters.some(
        v => v.toString() === req.user._id.toString()
      );

      if (!alreadyVoted) {
        vote.options[option_index].voters.push(req.user._id);
      }
    }

    await vote.save();
    await vote.populate('created_by', 'username avatar_url');

    res.json({ vote });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete vote (hard delete)
router.delete('/:voteId', authenticate, async (req, res) => {
  try {
    const vote = await Vote.findById(req.params.voteId);

    if (!vote) {
      return res.status(404).json({ error: 'Vote not found' });
    }

    // Verify conversation and participation
    const conversation = await Conversation.findById(vote.conversation_id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Check if user is the creator OR an admin/moderator of the group
    const isCreator = vote.created_by.toString() === req.user._id.toString();
    const participant = conversation.participants.find(
      p => p.user_id.toString() === req.user._id.toString()
    );
    const isAdminOrModerator = participant && ['admin', 'moderator'].includes(participant.role);

    if (!isCreator && !isAdminOrModerator) {
      return res.status(403).json({ error: 'Only the creator or group admins can delete this vote' });
    }

    // Hard delete the vote
    await Vote.findByIdAndDelete(req.params.voteId);

    // Emit socket event to notify all participants
    const io = req.app.get('io');
    if (io) {
      conversation.participants.forEach(p => {
        io.to(`user_${p.user_id}`).emit('vote_deleted', {
          vote_id: req.params.voteId,
          conversation_id: vote.conversation_id.toString()
        });
      });
    }

    res.json({ message: 'Vote deleted successfully' });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

