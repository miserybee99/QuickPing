import Deadline from '../models/Deadline.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { sendDeadlineReminderEmail } from './email.service.js';

/**
 * Check deadlines and send reminders for those expiring in ~12 hours
 * This function should be called periodically (e.g., every hour)
 */
export const checkAndSendDeadlineReminders = async () => {
  try {
    console.log('⏰ Checking for deadline reminders...');

    const now = new Date();
    console.log('📅 Current time:', now.toISOString());
    
    // Calculate time window: 11 to 13 hours from now
    // This gives us a 2-hour window to catch deadlines around 12 hours
    const minTime = new Date(now.getTime() + 11 * 60 * 60 * 1000); // 11 hours from now
    const maxTime = new Date(now.getTime() + 13 * 60 * 60 * 1000); // 13 hours from now
    console.log('🔍 Checking deadlines between:', minTime.toISOString(), 'and', maxTime.toISOString());

    // Find deadlines in this time window that haven't been reminded yet
    const deadlines = await Deadline.find({
      due_date: {
        $gte: minTime,
        $lte: maxTime
      },
      $or: [
        { reminder_sent: { $exists: false } },
        { reminder_sent: false },
        { reminder_sent: null }
      ]
    })
    .populate('conversation_id')
    .populate('created_by', 'username email');

    console.log(`📋 Found ${deadlines.length} deadlines requiring reminders`);

    for (const deadline of deadlines) {
      try {
        const conversation = deadline.conversation_id;
        
        if (!conversation) {
          console.warn(`⚠️ Conversation not found for deadline ${deadline._id}`);
          continue;
        }

        // Get all participants in the conversation
        const participantIds = conversation.participants.map(p => p.user_id);
        const users = await User.find({ 
          _id: { $in: participantIds },
          email: { $exists: true, $ne: '' } // Only users with valid email
        });

        console.log(`📧 Sending reminders to ${users.length} users for deadline: ${deadline.title}`);

        // Calculate exact hours left
        const hoursLeft = Math.round((new Date(deadline.due_date) - now) / (1000 * 60 * 60));

        // Send email to each participant
        for (const user of users) {
          try {
            await sendDeadlineReminderEmail(
              user.email,
              user.username,
              deadline,
              conversation,
              hoursLeft
            );
            console.log(`✅ Reminder sent to ${user.email} for deadline: ${deadline.title}`);
          } catch (emailError) {
            console.error(`❌ Failed to send reminder to ${user.email}:`, emailError.message);
          }
        }

        // Mark deadline as reminded
        deadline.reminder_sent = true;
        deadline.reminder_sent_at = new Date();
        await deadline.save();

        console.log(`✅ Marked deadline ${deadline._id} as reminded`);
      } catch (deadlineError) {
        console.error(`❌ Error processing deadline ${deadline._id}:`, deadlineError.message);
      }
    }

    console.log('⏰ Deadline reminder check completed');
  } catch (error) {
    console.error('❌ Error in checkAndSendDeadlineReminders:', error);
  }
};

/**
 * Start the deadline reminder scheduler
 * Runs every 5 minutes
 */
export const startDeadlineReminderScheduler = () => {
  const interval = 5 * 60 * 1000; // 5 minutes
  
  console.log(`🚀 Starting deadline reminder scheduler (runs every 5 minutes)`);
  
  // Run immediately on startup
  checkAndSendDeadlineReminders();
  
  // Then run periodically
  setInterval(() => {
    checkAndSendDeadlineReminders();
  }, interval);
};

export default {
  checkAndSendDeadlineReminders,
  startDeadlineReminderScheduler
};
