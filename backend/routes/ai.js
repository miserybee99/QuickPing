import express from 'express';
import { body, validationResult } from 'express-validator';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { authenticate } from '../middleware/auth.js';
import { isGeminiConfigured, getGeminiModel } from '../config/gemini.js';

const router = express.Router();

// Simple in-memory cache for summaries
const summaryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting - simple in-memory implementation
const rateLimits = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute per user

// Message limit for summarization
const MAX_MESSAGES = 50;

function checkRateLimit(userId) {
  const now = Date.now();
  const userLimits = rateLimits.get(userId) || { count: 0, windowStart: now };
  
  // Reset window if expired
  if (now - userLimits.windowStart > RATE_LIMIT_WINDOW) {
    userLimits.count = 0;
    userLimits.windowStart = now;
  }
  
  if (userLimits.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  
  userLimits.count++;
  rateLimits.set(userId, userLimits);
  return true;
}

// Get cached summary
function getCachedSummary(conversationId, lastMessageTime) {
  const cached = summaryCache.get(conversationId);
  if (!cached) return null;
  
  // Check if cache is still valid
  const now = Date.now();
  if (now - cached.timestamp > CACHE_TTL) {
    summaryCache.delete(conversationId);
    return null;
  }
  
  // Check if there are new messages since the cache was created
  if (lastMessageTime && new Date(lastMessageTime) > new Date(cached.lastMessageTime)) {
    summaryCache.delete(conversationId);
    return null;
  }
  
  return cached.summary;
}

// Set cached summary
function setCachedSummary(conversationId, summary, lastMessageTime) {
  summaryCache.set(conversationId, {
    summary,
    timestamp: Date.now(),
    lastMessageTime
  });
}

// Build the enhanced prompt for better summarization
function buildSummarizationPrompt(conversationText, messageCount, participantNames) {
  return `Bạn là AI assistant chuyên phân tích và tóm tắt cuộc trò chuyện.

## THÔNG TIN CUỘC TRÒ CHUYỆN:
- Số tin nhắn: ${messageCount}
- Người tham gia: ${participantNames.join(', ')}

## NỘI DUNG CUỘC TRÒ CHUYỆN:
${conversationText}

## NHIỆM VỤ:
Viết một bản tóm tắt ngắn gọn, dễ đọc về cuộc trò chuyện trên.

## YÊU CẦU:
- Trả lời bằng tiếng Việt
- Viết dưới dạng văn bản thông thường (KHÔNG dùng JSON)
- Tóm tắt ngắn gọn trong 3-5 câu
- Nêu rõ các chủ đề chính được thảo luận
- Đề cập đến những quyết định quan trọng (nếu có)
- Liệt kê việc cần làm (nếu có)
- Giữ văn phong tự nhiên, dễ hiểu

## VÍ DỤ OUTPUT:
Cuộc trò chuyện giữa @user1 và @user2 chủ yếu về việc lên kế hoạch cho dự án ABC. Hai người đã thống nhất deadline là ngày 20/12 và phân công @user1 phụ trách frontend, @user2 phụ trách backend. Cần họp lại vào tuần sau để review tiến độ.`;
}

// Call Gemini API
async function callGemini(messages, conversationText) {
  if (!isGeminiConfigured()) {
    console.warn('GEMINI_API_KEY not set, using placeholder summary');
    return generatePlaceholderSummary(messages);
  }

  // Get participant names
  const participantNames = [...new Set(messages.map(m => m.sender_id?.username).filter(Boolean))];
  
  const prompt = buildSummarizationPrompt(conversationText, messages.length, participantNames);

  try {
    const model = getGeminiModel('gemini-2.5-flash');
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000
      }
    });

    const response = await result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No content in Gemini response');
    }

    // Return plain text summary
    return {
      topics: [],
      overall_summary: content.trim(),
      key_decisions: [],
      action_items: [],
      summary: content.trim(),
      keyPoints: [],
      actionItems: []
    };
  } catch (error) {
    console.error('Gemini API call failed:', error);
    throw error;
  }
}

// Generate placeholder summary when Gemini is not available
function generatePlaceholderSummary(messages) {
  const participants = [...new Set(messages.map(m => m.sender_id?.username).filter(Boolean))];
  const messageCount = messages.length;
  
  // Simple analysis
  const topics = [];
  const messageTexts = messages.map(m => m.content?.toLowerCase() || '').join(' ');
  
  // Detect common topics (Vietnamese keywords)
  if (messageTexts.includes('họp') || messageTexts.includes('meeting')) {
    topics.push({ name: 'Cuộc họp', summary: 'Thảo luận về cuộc họp', participants });
  }
  if (messageTexts.includes('project') || messageTexts.includes('dự án')) {
    topics.push({ name: 'Dự án', summary: 'Thảo luận về dự án', participants });
  }
  if (messageTexts.includes('deadline') || messageTexts.includes('hạn')) {
    topics.push({ name: 'Deadline', summary: 'Thảo luận về deadline', participants });
  }
  if (messageTexts.includes('bug') || messageTexts.includes('lỗi')) {
    topics.push({ name: 'Issues/Bugs', summary: 'Thảo luận về lỗi/vấn đề', participants });
  }
  if (messageTexts.includes('review') || messageTexts.includes('đánh giá')) {
    topics.push({ name: 'Review', summary: 'Thảo luận về review', participants });
  }
  
  // If no specific topics detected, add a general one
  if (topics.length === 0) {
    topics.push({ 
      name: 'Trò chuyện chung', 
      summary: 'Cuộc trò chuyện bao gồm nhiều chủ đề khác nhau', 
      participants 
    });
  }
  
  const overallSummary = `Cuộc trò chuyện này có ${messageCount} tin nhắn từ ${participants.length} người tham gia (${participants.join(', ')}). ${topics.length > 0 ? `Các chủ đề được đề cập: ${topics.map(t => t.name).join(', ')}.` : ''}`;
  
  return {
    topics,
    overall_summary: overallSummary,
    key_decisions: [],
    action_items: [],
    // Legacy fields
    summary: overallSummary,
    keyPoints: [
      `${messageCount} tin nhắn tổng cộng`,
      `${participants.length} người tham gia`,
      topics.length > 0 ? `Chủ đề chính: ${topics.map(t => t.name).join(', ')}` : 'Nhiều chủ đề được thảo luận'
    ],
    actionItems: []
  };
}

// Summarize conversation/thread
router.post('/summarize', authenticate, [
  body('conversation_id').optional().isMongoId().withMessage('Invalid conversation ID'),
  body('thread_id').optional().isMongoId().withMessage('Invalid thread ID'),
  body('type').optional().isIn(['conversation', 'thread']).withMessage('Type must be conversation or thread')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(e => e.msg).join(', ');
      return res.status(400).json({ error: errorMessages });
    }

    // Rate limiting
    if (!checkRateLimit(req.user._id.toString())) {
      return res.status(429).json({ 
        error: 'Quá nhiều yêu cầu. Vui lòng đợi 1 phút và thử lại.',
        code: 'RATE_LIMITED'
      });
    }

    const { conversation_id, thread_id, type } = req.body;

    // Require at least one ID
    if (!conversation_id && !thread_id) {
      return res.status(400).json({ error: 'Cần cung cấp conversation_id hoặc thread_id' });
    }

    let messages;
    let conversation;
    
    if (type === 'thread' && thread_id) {
      messages = await Message.find({
        $or: [
          { _id: thread_id },
          { thread_id: thread_id }
        ]
      })
      .populate('sender_id', 'username')
      .sort({ created_at: -1 }) // Sort descending to get newest first
      .limit(MAX_MESSAGES);
      
      // Reverse to get chronological order for summarization
      messages = messages.reverse();
    } else if (conversation_id) {
      // Check access first
      conversation = await Conversation.findById(conversation_id);
      if (!conversation) {
        return res.status(404).json({ error: 'Cuộc trò chuyện không tồn tại' });
      }
      const isParticipant = conversation?.participants.some(
        p => p.user_id.toString() === req.user._id.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ error: 'Bạn không có quyền truy cập cuộc trò chuyện này' });
      }

      // Get only the latest MAX_MESSAGES messages
      messages = await Message.find({ conversation_id })
        .populate('sender_id', 'username')
        .sort({ created_at: -1 }) // Sort descending to get newest first
        .limit(MAX_MESSAGES);
      
      // Reverse to get chronological order for summarization
      messages = messages.reverse();
    } else if (thread_id) {
      // Thread without explicit type
      messages = await Message.find({
        $or: [
          { _id: thread_id },
          { thread_id: thread_id }
        ]
      })
      .populate('sender_id', 'username')
      .sort({ created_at: -1 })
      .limit(MAX_MESSAGES);
      
      messages = messages.reverse();
    } else {
      return res.status(400).json({ error: 'Thiếu thông tin cuộc trò chuyện' });
    }

    // Check message count
    if (messages.length === 0) {
      return res.status(400).json({ 
        error: 'Cuộc trò chuyện không có tin nhắn để tóm tắt.',
        code: 'NO_MESSAGES'
      });
    }

    if (messages.length < 3) {
      return res.status(400).json({ 
        error: 'Cần ít nhất 3 tin nhắn để tạo tóm tắt.',
        code: 'TOO_FEW_MESSAGES'
      });
    }

    // Check cache
    const lastMessage = messages[messages.length - 1];
    const lastMessageTime = lastMessage.created_at;
    const cacheKey = conversation_id || thread_id;
    
    const cachedSummary = getCachedSummary(cacheKey, lastMessageTime);
    if (cachedSummary) {
      console.log('📦 Returning cached summary for:', cacheKey);
      return res.json({
        ...cachedSummary,
        message_count: messages.length,
        cached: true
      });
    }

    // Format messages for AI - filter out sensitive data
    const conversationText = messages
      .map(m => {
        const username = m.sender_id?.username || 'Unknown';
        const content = m.content || '[File/Media]';
        const timestamp = new Date(m.created_at).toLocaleString('vi-VN');
        // Filter out potential PII patterns (emails, phone numbers)
        const filteredContent = content
          .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]')
          .replace(/\b\d{10,}\b/g, '[phone]');
        return `[${timestamp}] ${username}: ${filteredContent}`;
      })
      .join('\n');

    // Call AI
    let summary;
    try {
      console.log(`🤖 Calling Gemini AI for ${messages.length} messages...`);
      summary = await callGemini(messages, conversationText);
      console.log('✅ Gemini AI summary generated successfully');
    } catch (aiError) {
      console.error('AI error, using placeholder:', aiError);
      summary = generatePlaceholderSummary(messages);
    }

    // Cache the result
    setCachedSummary(cacheKey, summary, lastMessageTime);

    res.json({
      ...summary,
      message_count: messages.length,
      cached: false
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ error: 'Không thể tạo tóm tắt. Vui lòng thử lại.' });
  }
});

// Invalidate cache when new message is sent (called from message routes)
export function invalidateSummaryCache(conversationId) {
  if (conversationId) {
    summaryCache.delete(conversationId);
  }
}

export default router;
