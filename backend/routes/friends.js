import express from 'express';
import { body, validationResult } from 'express-validator';
import Friendship from '../models/Friendship.js';
import Notification from '../models/Notification.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Send friend request
router.post('/request', authenticate, [
  body('friend_id').isMongoId()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { friend_id } = req.body;

    if (friend_id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }

    // Check if friendship already exists
    let friendship = await Friendship.findOne({
      $or: [
        { user_id: req.user._id, friend_id },
        { user_id: friend_id, friend_id: req.user._id }
      ]
    });

    if (friendship) {
      return res.status(400).json({ error: 'Friendship already exists' });
    }

    // Create friend request
    friendship = new Friendship({
      user_id: req.user._id,
      friend_id,
      status: 'pending'
    });

    await friendship.save();

    // Create notification
    const notification = new Notification({
      user_id: friend_id,
      type: 'friend_request',
      title: 'New Friend Request',
      message: `${req.user.username} sent you a friend request`,
      data: {
        friend_id: req.user._id,
        friendship_id: friendship._id
      }
    });
    await notification.save();

    res.status(201).json({ friendship });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Respond to friend request
router.put('/request/:friendshipId', authenticate, [
  body('status').isIn(['accepted', 'rejected'])
], async (req, res) => {
  try {
    const { status } = req.body;
    const friendship = await Friendship.findById(req.params.friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    if (friendship.friend_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    friendship.status = status;
    friendship.responded_at = new Date();
    await friendship.save();

    res.json({ friendship });
  } catch (error) {
    console.error('Respond friend request error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friend requests
router.get('/requests', authenticate, async (req, res) => {
  try {
    const requests = await Friendship.find({
      friend_id: req.user._id,
      status: 'pending'
    })
    .populate('user_id', 'username avatar_url email')
    .sort({ sent_at: -1 });

    res.json({ requests });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get friends list
router.get('/', authenticate, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { user_id: req.user._id, status: 'accepted' },
        { friend_id: req.user._id, status: 'accepted' }
      ]
    })
    .populate('user_id', 'username avatar_url email is_online last_seen')
    .populate('friend_id', 'username avatar_url email is_online last_seen');

    const friends = friendships.map(f => {
      const friend = f.user_id._id.toString() === req.user._id.toString() 
        ? f.friend_id 
        : f.user_id;
      return friend;
    });

    res.json({ friends });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Check friendship status with a user
router.get('/status/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const friendship = await Friendship.findOne({
      $or: [
        { user_id: req.user._id, friend_id: userId },
        { user_id: userId, friend_id: req.user._id }
      ]
    });

    if (!friendship) {
      return res.json({ status: 'none', friendship: null });
    }

    // Determine if current user sent the request
    const isSender = friendship.user_id.toString() === req.user._id.toString();
    
    res.json({ 
      status: friendship.status,
      isSender,
      friendship_id: friendship._id
    });
  } catch (error) {
    console.error('Check friendship status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

