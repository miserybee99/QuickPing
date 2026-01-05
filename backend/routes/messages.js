import express from 'express';
import { body, validationResult } from 'express-validator';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Socket.io instance will be set by server.js
let io;

// Get messages for conversation
router.get('/conversation/:conversationId', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Filter out thread messages - only show main conversation messages
    let query = { 
      conversation_id: conversationId,
      thread_id: { $exists: false } // Exclude messages that are replies in threads
    };
    if (before) {
      query.created_at = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender_id', 'username avatar_url')
      .populate({
        path: 'reply_to',
        populate: { path: 'sender_id', select: 'username avatar_url' }
      })
      .populate('file_info.file_id')
      .populate('read_by.user_id', 'username avatar_url')
      .populate('reactions.user_id', 'username avatar_url')
      .sort({ created_at: -1 })
      .limit(parseInt(limit));

    res.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get thread replies
router.get('/thread/:threadId', authenticate, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { limit = 50 } = req.query;

    // First find the parent message to verify access
    const parentMessage = await Message.findById(threadId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if user is participant in the conversation
    const conversation = await Conversation.findById(parentMessage.conversation_id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all replies to this thread
    const messages = await Message.find({ thread_id: threadId })
      .populate('sender_id', 'username avatar_url')
      .populate('reactions.user_id', 'username avatar_url')
      .sort({ created_at: 1 })
      .limit(parseInt(limit));

    res.json({ messages, thread_name: parentMessage.thread_name });
  } catch (error) {
    console.error('Get thread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all threads for a conversation
router.get('/conversation/:conversationId/threads', authenticate, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Check if user is participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all messages that are thread parents (have thread_id field but are themselves not replies)
    const threads = await Message.find({
      conversation_id: conversationId,
      thread_id: { $exists: false } // Parent messages only
    })
      .populate('sender_id', 'username avatar_url')
      .populate({
        path: 'reply_to',
        populate: { path: 'sender_id', select: 'username avatar_url' }
      })
      .sort({ updated_at: -1 });

    // Filter to only messages that have replies (actual threads)
    const threadsWithReplies = await Promise.all(
      threads.map(async (msg) => {
        const replyCount = await Message.countDocuments({ thread_id: msg._id });
        if (replyCount > 0) {
          return {
            _id: msg._id,
            thread_name: msg.thread_name,
            content: msg.content,
            sender_id: msg.sender_id,
            reply_count: replyCount,
            created_at: msg.created_at,
            updated_at: msg.updated_at,
          };
        }
        return null;
      })
    );

    const validThreads = threadsWithReplies.filter(t => t !== null);

    res.json({ threads: validThreads });
  } catch (error) {
    console.error('Get threads error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update thread name
router.put('/thread/:threadId/name', authenticate, [
  body('thread_name').trim().isLength({ min: 1, max: 100 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { threadId } = req.params;
    const { thread_name } = req.body;

    // Find the parent message (thread)
    const parentMessage = await Message.findById(threadId);
    if (!parentMessage) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if user is participant in the conversation
    const conversation = await Conversation.findById(parentMessage.conversation_id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update thread name
    parentMessage.thread_name = thread_name;
    await parentMessage.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`conversation_${conversation._id}`).emit('thread_name_updated', {
        thread_id: threadId,
        thread_name: thread_name,
        conversation_id: conversation._id.toString()
      });
    }

    res.json({ message: parentMessage });
  } catch (error) {
    console.error('Update thread name error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create message
router.post('/', authenticate, [
  body('conversation_id').isMongoId(),
  body('content').optional().trim(),
  body('type').optional().isIn(['text', 'file', 'image', 'video'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { conversation_id, content, type = 'text', file_info, reply_to, thread_id } = req.body;

    // Verify conversation and participation
    const conversation = await Conversation.findById(conversation_id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const isParticipant = conversation.participants.some(
      p => p.user_id.toString() === req.user._id.toString()
    );

    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const message = new Message({
      conversation_id,
      sender_id: req.user._id,
      content,
      type,
      file_info,
      reply_to,
      thread_id
    });

    await message.save();

    // Update conversation last message
    conversation.last_message = message._id;
    conversation.updated_at = new Date();
    await conversation.save();

    // Populate before sending
    await message.populate('sender_id', 'username avatar_url');
    if (reply_to) {
      await message.populate({
        path: 'reply_to',
        populate: { path: 'sender_id', select: 'username avatar_url' }
      });
    }

    // Emit socket event for realtime update
    if (io) {
      const messageObject = message.toObject();
      const conversationIdStr = conversation_id.toString();
      const room = `conversation_${conversationIdStr}`;
      
      console.log(`📤 Emitting message to room: ${room}`, {
        messageId: messageObject._id,
        conversationId: conversationIdStr,
        senderId: req.user._id.toString()
      });
      
      // Get room size for debugging
      const roomSockets = await io.in(room).fetchSockets();
      console.log(`👥 Room ${room} has ${roomSockets.length} socket(s)`);
      
      // Emit to all users in the conversation room
      io.to(room).emit('message_received', {
        message: messageObject,
        conversation_id: conversationIdStr
      });
      
      console.log(`✅ Message emitted to room: ${room}`);
    } else {
      console.warn('⚠️ Socket.io not available, message saved but not broadcasted');
    }

    res.status(201).json({ message });
  } catch (error) {
    console.error('Create message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Edit message
router.put('/:messageId', authenticate, [
  body('content').trim().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.sender_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    message.content = req.body.content;
    message.is_edited = true;
    await message.save();

    await message.populate('sender_id', 'username avatar_url');

    res.json({ message });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reaction
router.post('/:messageId/reaction', authenticate, [
  body('emoji').trim().notEmpty()
], async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Remove existing reaction from this user
    message.reactions = message.reactions.filter(
      r => r.user_id.toString() !== req.user._id.toString()
    );

    // Add new reaction
    message.reactions.push({
      emoji,
      user_id: req.user._id
    });

    await message.save();
    await message.populate('sender_id', 'username avatar_url');

    res.json({ message });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove reaction
router.delete('/:messageId/reaction/:emoji', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    message.reactions = message.reactions.filter(
      r => !(r.user_id.toString() === req.user._id.toString() && r.emoji === req.params.emoji)
    );

    await message.save();

    res.json({ message });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark as read
router.post('/:messageId/read', authenticate, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if already read by this user
    const alreadyRead = message.read_by.some(
      r => r.user_id.toString() === req.user._id.toString()
    );
    
    if (alreadyRead) {
      // Already read, just return the message
      return res.json({ message });
    }

    // Add new read_by entry
    message.read_by.push({
      user_id: req.user._id,
      read_at: new Date()
    });

    await message.save();
    
    // Emit socket event for read receipt
    if (io) {
      const conversationIdStr = message.conversation_id.toString();
      const room = `conversation_${conversationIdStr}`;
      
      console.log(`📖 User ${req.user._id} marked message ${message._id} as read`);
      
      io.to(room).emit('read_receipt', {
        user_id: req.user._id.toString(),
        message_id: message._id.toString(),
        conversation_id: conversationIdStr,
        read_at: new Date()
      });
    }

    res.json({ message });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Function to set socket.io instance
export const setSocketIO = (socketIO) => {
  io = socketIO;
};

export default router;

