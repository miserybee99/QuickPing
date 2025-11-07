/**
 * API Test Script for QuickPing
 * 
 * Usage: node scripts/test-api.js [test_name]
 * 
 * Examples:
 *   node scripts/test-api.js all              # Test all endpoints
 *   node scripts/test-api.js auth             # Test auth endpoints only
 *   node scripts/test-api.js messages         # Test messages endpoints only
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const BASE_URL = API_URL.replace('/api', '');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Test state
let authToken = null;
let userId = null;
let conversationId = null;
let messageId = null;
let friendId = null;

// Helper functions
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function separator() {
  console.log('\n' + '='.repeat(80) + '\n');
}

function success(message) {
  log(`✅ ${message}`, colors.green);
}

function error(message) {
  log(`❌ ${message}`, colors.red);
}

function info(message) {
  log(`ℹ️  ${message}`, colors.cyan);
}

function warning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

// Test runner
async function runTest(name, testFn) {
  try {
    log(`\n🧪 Testing: ${name}`, colors.bright);
    await testFn();
    success(`${name} - PASSED`);
  } catch (err) {
    error(`${name} - FAILED`);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
    throw err;
  }
}

// ============================================================================
// HEALTH CHECK
// ============================================================================
async function testHealthCheck() {
  const response = await axios.get(`${BASE_URL}/health`);
  if (response.data.status === 'ok') {
    success('Server is running');
  } else {
    throw new Error('Health check failed');
  }
}

// ============================================================================
// AUTH TESTS
// ============================================================================
async function testRegister() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testUsername = `testuser_${Date.now()}`;
  
  const response = await axios.post(`${API_URL}/auth/register`, {
    email: testEmail,
    username: testUsername,
    password: 'testpassword123',
    mssv: 'TEST123'
  });

  if (response.data.token && response.data.user) {
    authToken = response.data.token;
    userId = response.data.user._id;
    success(`Registered user: ${testUsername} (${testEmail})`);
    info(`Token: ${authToken.substring(0, 20)}...`);
  } else {
    throw new Error('Registration failed - no token returned');
  }
}

async function testLogin() {
  // First register a user
  const testEmail = `login_${Date.now()}@example.com`;
  const testUsername = `loginuser_${Date.now()}`;
  const password = 'testpassword123';

  await axios.post(`${API_URL}/auth/register`, {
    email: testEmail,
    username: testUsername,
    password: password
  });

  // Then login
  const response = await axios.post(`${API_URL}/auth/login`, {
    email: testEmail,
    password: password
  });

  if (response.data.token && response.data.user) {
    authToken = response.data.token;
    userId = response.data.user._id;
    success(`Logged in as: ${testUsername}`);
  } else {
    throw new Error('Login failed');
  }
}

async function testGetMe() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.user) {
    success(`Current user: ${response.data.user.username}`);
    userId = response.data.user._id;
  } else {
    throw new Error('Get me failed');
  }
}

async function testLogout() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.post(`${API_URL}/auth/logout`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message === 'Logged out successfully') {
    success('Logged out successfully');
    authToken = null;
  } else {
    throw new Error('Logout failed');
  }
}

// ============================================================================
// USER TESTS
// ============================================================================
async function testSearchUsers() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.get(`${API_URL}/users/search?query=test`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (Array.isArray(response.data.users)) {
    success(`Found ${response.data.users.length} users`);
  } else {
    throw new Error('Search users failed');
  }
}

// ============================================================================
// CONVERSATION TESTS
// ============================================================================
async function testCreateDirectConversation() {
  if (!authToken) throw new Error('No auth token available');
  if (!userId) throw new Error('No user ID available');

  // First, search for another user or create one
  const testEmail2 = `test2_${Date.now()}@example.com`;
  const testUsername2 = `testuser2_${Date.now()}`;
  
  const registerResponse = await axios.post(`${API_URL}/auth/register`, {
    email: testEmail2,
    username: testUsername2,
    password: 'testpassword123'
  });

  friendId = registerResponse.data.user._id;

  // Create conversation
  const response = await axios.post(`${API_URL}/conversations`, {
    type: 'direct',
    participant_ids: [friendId]
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.conversation) {
    conversationId = response.data.conversation._id;
    success(`Created conversation: ${conversationId}`);
  } else {
    throw new Error('Create conversation failed');
  }
}

async function testGetConversations() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.get(`${API_URL}/conversations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (Array.isArray(response.data.conversations)) {
    success(`Found ${response.data.conversations.length} conversations`);
  } else {
    throw new Error('Get conversations failed');
  }
}

async function testGetConversationById() {
  if (!authToken) throw new Error('No auth token available');
  if (!conversationId) throw new Error('No conversation ID available');

  const response = await axios.get(`${API_URL}/conversations/${conversationId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.conversation) {
    success(`Got conversation: ${response.data.conversation._id}`);
  } else {
    throw new Error('Get conversation by ID failed');
  }
}

// ============================================================================
// MESSAGE TESTS
// ============================================================================
async function testCreateMessage() {
  if (!authToken) throw new Error('No auth token available');
  if (!conversationId) throw new Error('No conversation ID available');

  const response = await axios.post(`${API_URL}/messages`, {
    conversation_id: conversationId,
    content: `Test message at ${new Date().toISOString()}`,
    type: 'text'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message) {
    messageId = response.data.message._id;
    success(`Created message: ${messageId}`);
  } else {
    throw new Error('Create message failed');
  }
}

async function testGetMessages() {
  if (!authToken) throw new Error('No auth token available');
  if (!conversationId) throw new Error('No conversation ID available');

  const response = await axios.get(`${API_URL}/messages/conversation/${conversationId}`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (Array.isArray(response.data.messages)) {
    success(`Found ${response.data.messages.length} messages`);
  } else {
    throw new Error('Get messages failed');
  }
}

async function testEditMessage() {
  if (!authToken) throw new Error('No auth token available');
  if (!messageId) throw new Error('No message ID available');

  const response = await axios.put(`${API_URL}/messages/${messageId}`, {
    content: `Edited message at ${new Date().toISOString()}`
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message && response.data.message.is_edited) {
    success(`Edited message: ${messageId}`);
  } else {
    throw new Error('Edit message failed');
  }
}

async function testAddReaction() {
  if (!authToken) throw new Error('No auth token available');
  if (!messageId) throw new Error('No message ID available');

  const response = await axios.post(`${API_URL}/messages/${messageId}/reaction`, {
    emoji: '👍'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message && response.data.message.reactions) {
    success(`Added reaction 👍 to message`);
  } else {
    throw new Error('Add reaction failed');
  }
}

async function testRemoveReaction() {
  if (!authToken) throw new Error('No auth token available');
  if (!messageId) throw new Error('No message ID available');

  const response = await axios.delete(`${API_URL}/messages/${messageId}/reaction/👍`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message) {
    success(`Removed reaction 👍 from message`);
  } else {
    throw new Error('Remove reaction failed');
  }
}

async function testMarkAsRead() {
  if (!authToken) throw new Error('No auth token available');
  if (!messageId) throw new Error('No message ID available');

  const response = await axios.post(`${API_URL}/messages/${messageId}/read`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.message) {
    success(`Marked message as read`);
  } else {
    throw new Error('Mark as read failed');
  }
}

// ============================================================================
// FRIEND TESTS
// ============================================================================
async function testSendFriendRequest() {
  if (!authToken) throw new Error('No auth token available');
  if (!friendId) throw new Error('No friend ID available');

  const response = await axios.post(`${API_URL}/friends/request`, {
    friend_id: friendId
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (response.data.friendship) {
    success(`Sent friend request to user: ${friendId}`);
  } else {
    throw new Error('Send friend request failed');
  }
}

async function testGetFriends() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.get(`${API_URL}/friends`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (Array.isArray(response.data.friends)) {
    success(`Found ${response.data.friends.length} friends`);
  } else {
    throw new Error('Get friends failed');
  }
}

async function testGetFriendRequests() {
  if (!authToken) throw new Error('No auth token available');

  const response = await axios.get(`${API_URL}/friends/requests`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });

  if (Array.isArray(response.data.requests)) {
    success(`Found ${response.data.requests.length} friend requests`);
  } else {
    throw new Error('Get friend requests failed');
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================
const testSuites = {
  health: [
    { name: 'Health Check', fn: testHealthCheck }
  ],

  auth: [
    { name: 'Register', fn: testRegister },
    { name: 'Login', fn: testLogin },
    { name: 'Get Me', fn: testGetMe },
    { name: 'Logout', fn: testLogout }
  ],

  users: [
    { name: 'Search Users', fn: testSearchUsers }
  ],

  conversations: [
    { name: 'Create Direct Conversation', fn: testCreateDirectConversation },
    { name: 'Get Conversations', fn: testGetConversations },
    { name: 'Get Conversation By ID', fn: testGetConversationById }
  ],

  messages: [
    { name: 'Create Message', fn: testCreateMessage },
    { name: 'Get Messages', fn: testGetMessages },
    { name: 'Edit Message', fn: testEditMessage },
    { name: 'Add Reaction', fn: testAddReaction },
    { name: 'Remove Reaction', fn: testRemoveReaction },
    { name: 'Mark As Read', fn: testMarkAsRead }
  ],

  friends: [
    { name: 'Send Friend Request', fn: testSendFriendRequest },
    { name: 'Get Friends', fn: testGetFriends },
    { name: 'Get Friend Requests', fn: testGetFriendRequests }
  ],

  all: [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Register', fn: testRegister },
    { name: 'Login', fn: testLogin },
    { name: 'Get Me', fn: testGetMe },
    { name: 'Search Users', fn: testSearchUsers },
    { name: 'Create Direct Conversation', fn: testCreateDirectConversation },
    { name: 'Get Conversations', fn: testGetConversations },
    { name: 'Get Conversation By ID', fn: testGetConversationById },
    { name: 'Create Message', fn: testCreateMessage },
    { name: 'Get Messages', fn: testGetMessages },
    { name: 'Edit Message', fn: testEditMessage },
    { name: 'Add Reaction', fn: testAddReaction },
    { name: 'Remove Reaction', fn: testRemoveReaction },
    { name: 'Mark As Read', fn: testMarkAsRead },
    { name: 'Send Friend Request', fn: testSendFriendRequest },
    { name: 'Get Friends', fn: testGetFriends },
    { name: 'Get Friend Requests', fn: testGetFriendRequests }
  ]
};

// ============================================================================
// MAIN
// ============================================================================
async function main() {
  const testName = process.argv[2] || 'all';
  const suite = testSuites[testName];

  if (!suite) {
    error(`Unknown test suite: ${testName}`);
    console.log('\nAvailable test suites:');
    Object.keys(testSuites).forEach(name => {
      console.log(`  - ${name}`);
    });
    process.exit(1);
  }

  log('\n' + '='.repeat(80), colors.bright);
  log('🚀 QUICKPING API TEST SUITE', colors.bright);
  log('='.repeat(80), colors.bright);
  info(`API URL: ${API_URL}`);
  info(`Test Suite: ${testName}`);
  separator();

  let passed = 0;
  let failed = 0;

  for (const test of suite) {
    try {
      await runTest(test.name, test.fn);
      passed++;
    } catch (err) {
      failed++;
      // Continue with other tests
    }
  }

  separator();
  log('\n📊 TEST RESULTS', colors.bright);
  log(`✅ Passed: ${passed}`, colors.green);
  if (failed > 0) {
    log(`❌ Failed: ${failed}`, colors.red);
  }
  log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`, colors.cyan);
  separator();

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  error('Fatal error:', err);
  process.exit(1);
});

