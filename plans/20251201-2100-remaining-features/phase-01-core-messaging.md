# Phase 1: Core Messaging Enhancements

**Status:** 🟡 In Progress
**Priority:** 🔴 Critical
**Estimated:** 2-3 days

---

## 📋 Overview

Enhance the core messaging experience with seen status, edit message, and emoji picker integration.

---

## 🎯 Requirements

### 1.1 Seen Message UI
**Current:** Backend has `read_by` array, frontend calls `markAsRead` API
**Missing:** ~~Visual indicator (✓ sent, ✓✓ delivered, ✓✓ blue = seen)~~

**Tasks:**
- [x] Show single check (✓) for sent messages
- [x] Show double check (✓✓) gray for delivered
- [x] Show double check (✓✓) blue/purple for seen
- [x] For group: Show "Seen by X, Y and N others" with avatars
- [x] Tooltip with full list of readers and timestamps
- [x] **[PERF] Limit avatar display to 3-5 users for group chats.**

**Files:**
- `components/chat/seen-status.tsx` ✅ (already implemented)
- `components/chat/chat-panel.tsx` ✅ (integrated)

### 1.2 Last Seen Time
**Current:** Backend has `last_seen` field
**Missing:** ~~Display "Last seen X minutes ago" for offline users~~

**Tasks:**
- [x] Format relative time (just now, 5m ago, 2h ago, yesterday)
- [x] Show in chat header for direct messages
- [x] Update when user comes online

**Files:**
- `components/chat/chat-panel.tsx` ✅
- `lib/utils.ts` ✅ (added formatLastSeen, formatRelativeTime)

### 1.3 Edit Message
**Current:** Backend API `/messages/:id` PUT, `is_edited` flag
**Missing:** ~~UI to edit and display edited status~~

**Tasks:**
- [x] Add "Edit" option in message hover menu (only for own messages)
- [x] Inline edit mode with input
- [x] Save/Cancel buttons
- [x] Show "(edited)" badge on edited messages
- [ ] Keyboard shortcut: Arrow Up to edit last message
- [x] **[UX] Ensure Enter key submits the edit and Shift+Enter adds a newline in inline edit mode.**

**Files:**
- `components/chat/chat-panel.tsx` ✅
- `components/chat/message-actions.tsx` ✅ (new)
- `components/chat/message-edit-input.tsx` ✅ (new)

### 1.4 Emoji Picker in Input
**Current:** Component `EmojiPicker` exists but not integrated
**Missing:** ~~Button and integration in chat input~~

**Tasks:**
- [x] Add emoji button (😊) next to send button
- [x] Open emoji picker popover on click
- [x] Insert emoji at cursor position
- [x] Close picker after selection (optional: keep open for multiple)

**Files:**
- `components/chat/chat-panel.tsx` ✅
- `components/emoji/emoji-picker.tsx` ✅ (already exists)

### 1.5 Typing Indicator (NEW)
**Current:** ~~No real-time typing signaling.~~
**Status:** Already implemented

**Tasks:**
- [x] **[Socket] Send `typing_start` event** when user begins typing in input
- [x] **[Socket] Send `typing_stop` event** when user stops typing or sends a message
- [x] Display "X is typing..." or "X, Y are typing..." in the chat panel
- [x] Implement a timeout to automatically remove the indicator

**Files:**
- `backend/socket/socket.js` ✅
- `components/chat/chat-panel.tsx` ✅

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────┐
│              CHAT PANEL ARCHITECTURE (Frontend)         │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    HEADER AREA                          │
├─────────────────────────────────────────────────────────┤
│ [Avatar] | [User Name] | [Online/Offline Status]        │
│ [Secondary Status: Last Seen X ago]                     │
│ -----------------------------------------------------   │
│ (Position for NEW: TYPING INDICATOR "X is typing...")   │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    MESSAGE DISPLAY AREA                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Message Bubble (Supports Inline Edit Mode)       │    │
│  │                                 [Hover Actions:  │
│  │                                 Reply, Edit, Delete]│
│  │ 10:30 AM ✓✓ (seen) [Seen Status] (edited) [Badge]│    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  (Manages Seen Status, Edit Badge, Message Retry Icon ❌)│
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│                    INPUT AREA                           │
├─────────────────────────────────────────────────────────┤
│ [Attachment Button 📎]                                  │
│ [Main Input Field (Handles Enter/Shift+Enter)]          │
│ [Emoji Picker Button 😊] (Opens popover selector)       │
│ [Send Button ➤] (Triggers POST API / Socket Emit)       │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation Steps

### Step 1: Message Actions Menu (Hover)
1. Create `message-actions.tsx` component
2. Show on hover over message bubble
3. Include: Reply, React, Pin, Edit (own), Delete (own)
4. Position: right side for own messages, left for others

### Step 2: Edit Message Flow
1. Click Edit → Replace message content with input
2. Show Save/Cancel buttons
3. Call `PUT /messages/:id` on save
4. Update local state + socket emit
5. Show "(edited)" badge

### Step 3: Seen Status and Resilience Enhancement (UPDATED)
1. Ensure `SeenStatus` component shows correctly for all message states.
2. Add animation when status changes.
3. **[RESILIENCE] Implement a client-side retry logic for failed message API calls (e.g., failed to send).**

### Step 4: Typing Indicator Implementation (NEW STEP)
1. Implement socket logic (`typing_start/stop`) in `lib/socket.ts`.
2. Implement front-end state management to track active typers.
3. Display indicator in `chat-panel.tsx`.

### Step 5: Emoji Picker Integration
1. Add button in input area
2. Use existing `EmojiPicker` component
3. Handle emoji selection and insertion

---

## 🔌 API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| PUT | `/messages/:id` | Edit message |
| POST | `/messages/:id/read` | Mark as read |
| GET | `/messages/conversation/:id` | Get messages with read_by |

---

## ✅ Success Criteria

- [x] Seen status shows correctly (✓, ✓✓, ✓✓ blue) and is optimized for groups.
- [x] **Typing indicator works and times out correctly.**
- [x] "Last seen X ago" shows for offline users
- [x] Can edit own messages, "(edited)" displays
- [x] Emoji picker works in chat input
- [ ] **Client-side message sending failure/retry logic is implemented.**
- [x] All features work in both direct and group chats
- [x] No build errors, types correct

---

## 📦 New Files Created

| File | Purpose |
|------|---------|
| `components/chat/message-actions.tsx` | Hover menu with Reply, React, Pin, Edit, Delete actions |
| `components/chat/message-edit-input.tsx` | Inline edit input with Save/Cancel |
| `components/ui/dropdown-menu.tsx` | Radix UI dropdown menu component |
| `lib/utils.ts` | Added formatRelativeTime, formatLastSeen helpers |

## 🔧 Files Modified

| File | Changes |
|------|---------|
| `components/chat/chat-panel.tsx` | Added hover actions, edit mode, emoji picker integration, last seen display |
| `backend/socket/socket.js` | Added message_edited socket handler |
| `frontend/package.json` | Added @radix-ui/react-dropdown-menu dependency |
