import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

export const setupSocketIO = (io) => {
  const userSockets = new Map(); // userId -> socketId

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    userSockets.set(userId, socket.id);

    // Update user online status
    try {
      await User.findByIdAndUpdate(userId, { 
        is_online: true,
        last_seen: new Date()
      });
      console.log(`✅ User ${userId} marked as online`);
      
      // Notify all users about online status
      io.emit('user_status_changed', {
        user_id: userId,
        is_online: true,
        last_seen: new Date()
      });
    } catch (err) {
      console.error('Update online status error:', err);
    }

    // Join user's room
    socket.join(`user_${userId}`);

    // Join conversation rooms user is part of
    try {
      const conversations = await Conversation.find({ 'participants.user_id': userId });
      console.log(`📥 User ${userId} found ${conversations.length} conversations to join`);
      conversations.forEach(conv => {
        const room = `conversation_${conv._id}`;
        socket.join(room);
        console.log(`   ✅ User ${userId} joined room: ${room}`);
      });
      
      // Send initial online statuses for users in user's conversations
      const participantIds = new Set();
      conversations.forEach(conv => {
        conv.participants.forEach(p => {
          if (p.user_id.toString() !== userId) {
            participantIds.add(p.user_id.toString());
          }
        });
      });
      
      // Get online status for all relevant users
      if (participantIds.size > 0) {
        const users = await User.find({ _id: { $in: Array.from(participantIds) } })
          .select('_id is_online last_seen');
        
        // Send bulk status update to the connected user
        const statusUpdates = users.map(u => ({
          user_id: u._id.toString(),
          is_online: u.is_online || false,
          last_seen: u.last_seen || new Date()
        }));
        
        socket.emit('initial_user_statuses', statusUpdates);
        console.log(`📤 Sent initial statuses for ${statusUpdates.length} users to ${userId}`);
      }
    } catch (err) {
      console.error('Join conversations error:', err);
    }

    // Handle join conversation
    socket.on('join_conversation', async (conversationId) => {
      const room = `conversation_${conversationId}`;
      socket.join(room);
      console.log(`✅ User ${userId} joined conversation room: ${room}`);
      
      // Send online statuses for participants in this conversation
      try {
        const conversation = await Conversation.findById(conversationId)
          .populate('participants.user_id', '_id is_online last_seen');
        
        if (conversation) {
          const statusUpdates = conversation.participants
            .filter(p => p.user_id?._id?.toString() !== userId)
            .map(p => ({
              user_id: p.user_id?._id?.toString(),
              is_online: p.user_id?.is_online || false,
              last_seen: p.user_id?.last_seen || new Date()
            }));
          
          socket.emit('conversation_user_statuses', {
            conversation_id: conversationId,
            statuses: statusUpdates
          });
        }
      } catch (err) {
        console.error('Get conversation statuses error:', err);
      }
      
      // Confirm join to client
      socket.emit('joined_conversation', { conversation_id: conversationId });
    });

    // Handle leave conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation_${conversationId}`);
    });

    // Handle new message
    socket.on('new_message', async (data) => {
      // Broadcast to conversation room
      io.to(`conversation_${data.conversation_id}`).emit('message_received', data);
    });

    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(`conversation_${data.conversation_id}`).emit('user_typing', {
        user_id: userId,
        username: socket.user?.username || 'User',
        conversation_id: data.conversation_id
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`conversation_${data.conversation_id}`).emit('user_stopped_typing', {
        user_id: userId,
        conversation_id: data.conversation_id
      });
    });

    // Handle read receipt (single message)
    socket.on('message_read', (data) => {
      socket.to(`conversation_${data.conversation_id}`).emit('read_receipt', {
        user_id: userId,
        message_id: data.message_id,
        read_at: new Date()
      });
    });
    
    // Handle bulk messages read
    socket.on('messages_read', (data) => {
      console.log(`📖 User ${userId} read ${data.message_ids?.length || 0} messages in conversation ${data.conversation_id}`);
      
      // Broadcast to all users in the conversation
      socket.to(`conversation_${data.conversation_id}`).emit('messages_read_receipt', {
        user_id: userId,
        conversation_id: data.conversation_id,
        message_ids: data.message_ids,
        read_at: new Date()
      });
    });
    
    // Handle message edited
    socket.on('message_edited', (data) => {
      console.log(`✏️ User ${userId} edited message ${data.message_id} in conversation ${data.conversation_id}`);
      
      // Broadcast to all users in the conversation (including sender for confirmation)
      io.to(`conversation_${data.conversation_id}`).emit('message_edited', {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        content: data.content,
        is_edited: true,
        edited_by: userId,
        edited_at: new Date()
      });
    });

    // Handle reaction added
    socket.on('reaction_added', (data) => {
      console.log(`😀 User ${userId} added reaction ${data.emoji} to message ${data.message_id}`);
      
      io.to(`conversation_${data.conversation_id}`).emit('reaction_updated', {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        reactions: data.reactions,
        action: 'add',
        emoji: data.emoji,
        user_id: userId
      });
    });

    // Handle reaction removed
    socket.on('reaction_removed', (data) => {
      console.log(`😶 User ${userId} removed reaction ${data.emoji} from message ${data.message_id}`);
      
      io.to(`conversation_${data.conversation_id}`).emit('reaction_updated', {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        reactions: data.reactions,
        action: 'remove',
        emoji: data.emoji,
        user_id: userId
      });
    });

    // Handle message pinned
    socket.on('message_pinned', (data) => {
      console.log(`📌 User ${userId} pinned message ${data.message_id} in conversation ${data.conversation_id}`);
      
      io.to(`conversation_${data.conversation_id}`).emit('pin_updated', {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        action: 'pin',
        pinned_by: userId
      });
    });

    // Handle message unpinned
    socket.on('message_unpinned', (data) => {
      console.log(`📌 User ${userId} unpinned message ${data.message_id} in conversation ${data.conversation_id}`);
      
      io.to(`conversation_${data.conversation_id}`).emit('pin_updated', {
        message_id: data.message_id,
        conversation_id: data.conversation_id,
        action: 'unpin',
        unpinned_by: userId
      });
    });

    // Handle thread reply sent
    socket.on('thread_reply_sent', async (data) => {
      console.log(`💬 User ${userId} replied to thread ${data.thread_id}`);
      
      try {
        // Count actual thread replies from database for accuracy
        const actualReplyCount = await Message.countDocuments({ thread_id: data.thread_id });
        
        console.log(`📊 Thread ${data.thread_id} now has ${actualReplyCount} replies`);
        
        // Broadcast to ALL users in conversation (including sender) to ensure consistency
        io.to(`conversation_${data.conversation_id}`).emit('thread_updated', {
          thread_id: data.thread_id,
          conversation_id: data.conversation_id,
          reply_count: actualReplyCount,
          last_reply: data.message
        });
      } catch (error) {
        console.error('Error counting thread replies:', error);
        // Fallback to client-provided count
        io.to(`conversation_${data.conversation_id}`).emit('thread_updated', {
          thread_id: data.thread_id,
          conversation_id: data.conversation_id,
          reply_count: data.reply_count || 0,
          last_reply: data.message
        });
      }
    });

    // Handle vote created
    socket.on('vote_created', (data) => {
      console.log(`🗳️ User ${userId} created vote in conversation ${data.conversation_id}`);
      
      // Broadcast to all users in the conversation except sender
      socket.to(`conversation_${data.conversation_id}`).emit('new_vote', {
        conversation_id: data.conversation_id,
        vote: data.vote
      });
    });

    // Handle vote cast
    socket.on('vote_cast', (data) => {
      console.log(`✅ User ${userId} cast vote ${data.vote_id} in conversation ${data.conversation_id}`);
      
      // Broadcast to all users in the conversation
      io.to(`conversation_${data.conversation_id}`).emit('vote_updated', {
        conversation_id: data.conversation_id,
        vote_id: data.vote_id,
        vote: data.vote
      });
    });

    // Handle online status change
    socket.on('update_status', (status) => {
      io.emit('user_status_changed', {
        user_id: userId,
        is_online: status.is_online,
        last_seen: status.last_seen
      });
    });
    
    // Handle request for user statuses
    socket.on('get_user_statuses', async (userIds) => {
      try {
        const users = await User.find({ _id: { $in: userIds } })
          .select('_id is_online last_seen');
        
        const statusUpdates = users.map(u => ({
          user_id: u._id.toString(),
          is_online: u.is_online || false,
          last_seen: u.last_seen || new Date()
        }));
        
        socket.emit('user_statuses_response', statusUpdates);
      } catch (err) {
        console.error('Get user statuses error:', err);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
      userSockets.delete(userId);
      
      console.log(`🔌 User ${userId} disconnected`);
      
      // Update user offline status
      try {
        await User.findByIdAndUpdate(userId, {
          is_online: false,
          last_seen: new Date()
        });
        console.log(`✅ User ${userId} marked as offline`);
      } catch (err) {
        console.error('Update offline status error:', err);
      }

      // Notify all connected users
      io.emit('user_status_changed', {
        user_id: userId,
        is_online: false,
        last_seen: new Date()
      });
      console.log(`📤 Broadcasted offline status for user ${userId}`);
    });
  });

  return io;
};

