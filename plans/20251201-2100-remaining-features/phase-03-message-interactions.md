# Phase 3: Message Interactions

**Status:** ✅ Completed
**Priority:** 🟠 High
**Estimated:** 3-4 days

---

## 📋 Overview

Add reaction emoji, reply-to, thread view, and pin message features.

---

## 🎯 Requirements

### 3.1 Reaction Emoji
**Current:** Backend API ready, `EmojiPicker` & `ReactionViewer` exist
**Missing:** ~~Integration in message UI~~ ✅ Done

**Tasks:**
- [x] Add react button in message hover actions.
- [x] Click opens emoji picker.
- [x] Show reactions below message bubble (Max 3 types +N more).
- [x] Click existing reaction to add/remove (toggle).
- [x] Tooltip shows who reacted.
- [x] Socket emit for realtime reaction updates.

**Files:**
- `components/chat/message-reactions.tsx` ✅ Created
- `components/chat/message-actions.tsx` ✅ Updated
- `components/chat/chat-panel.tsx` ✅ Updated

### 3.2 Reply-to-Message
**Current:** Backend has `reply_to` field
**Missing:** ~~UI to reply and display~~ ✅ Done

**Tasks:**
- [x] Add reply button in hover actions.
- [x] Create `reply-preview.tsx` to show reply context above input.
- [x] Click X to cancel reply.
- [x] Create **`quoted-message.tsx`** component for display (Max 2 lines, click to jump).
- [x] Include `reply_to` when sending.
- [x] **[PERF] Implement check:** Before scrolling, verify the original message is loaded. If not, show "Loading older messages..." instead of immediately scrolling.

**Files:**
- `components/chat/reply-preview.tsx` ✅ Created
- `components/chat/quoted-message.tsx` ✅ Created
- `components/chat/chat-panel.tsx` ✅ Updated

### 3.3 Thread View
**Current:** Backend has `thread_id` field
**Missing:** ~~UI to view and create threads~~ ✅ Done

**Tasks:**
- [x] "Reply in thread" option in hover actions.
- [x] Create **`thread-panel.tsx`** (side panel or modal).
- [x] Show thread count badge on parent message (e.g., "5 replies").
- [x] Load thread messages from API and list all replies in panel.
- [x] Thread input to add replies (all replies must include `thread_id`).
- [x] **[LOGIC] Ensure input state is exclusive:** Cannot be in Reply Preview mode AND Thread Panel mode simultaneously.
- [x] **[SOCKETS] When new reply is received:** Socket only updates the **thread count badge** on the parent message in the main chat flow.

**Files:**
- `components/chat/thread-panel.tsx` ✅ Created
- `components/chat/chat-panel.tsx` ✅ Updated

### 3.4 Pin Message
**Current:** Backend API ready, `pinned_messages` in Conversation
**Missing:** ~~UI to pin and view pinned~~ ✅ Done

**Tasks:**
- [x] Add pin button in hover actions.
- [x] Create **`pinned-messages.tsx`** section at top of chat (collapsible).
- [x] Click to jump to message.
- [x] Unpin option.
- [x] **[SECURITY] Implement robust permission check:** Frontend checks Admin/Mod status before showing the pin button; Backend MUST validate permission on the API call.
- [x] Socket updates for pin changes.

**Files:**
- `components/chat/pinned-messages.tsx` ✅ Created
- `components/chat/message-actions.tsx` ✅ Updated
- `components/chat/chat-panel.tsx` ✅ Updated

---

## 🏗 Architecture

```
Message with Reactions & Reply:
┌─────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Quoted: "Original message..."        [x]            │ │
│ └─────────────────────────────────────────────────────┘ │
│ "Reply message content here"                            │
│                                                         │
│ [👍 3] [❤️ 2] [😂 1]   10:30 AM ✓✓                      │
│                        └─ Click to add/remove           │
└─────────────────────────────────────────────────────────┘

Thread Panel (Side):
┌──────────────────────────────────────┐
│ Thread                          [x]  │
├──────────────────────────────────────┤
│ Original Message                     │
│ "What should we do for lunch?"       │
│ └─ 5 replies                         │
├──────────────────────────────────────┤
│ Reply 1: "Pizza!"                    │
│ Reply 2: "Sushi sounds good"         │
│ Reply 3: "I'm in for pizza"          │
│ ...                                  │
├──────────────────────────────────────┤
│ [Reply to thread...]          [Send] │
└──────────────────────────────────────┘

Pinned Messages Section:
┌─────────────────────────────────────────────────────────┐
│ 📌 Pinned Messages (3)                            [▼]  │
├─────────────────────────────────────────────────────────┤
│ "Important announcement..."  - Admin, 2 days ago       │
│ "Meeting schedule..."        - Mod, 1 week ago         │
│ "Project deadline..."        - Admin, 2 weeks ago      │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation Steps (Revised for Logic and State Management)

### Step 1: Core Action Components & Permissions

1.  Create `message-actions.tsx` (Hover menu component).
2.  Position correctly for own/other messages.
3.  Include all action buttons (Reply, React, Pin, etc.).
4.  **[CRITICAL] Implement initial Permission Check** logic in `message-actions.tsx` (e.g., hide Pin/Edit button if user lacks moderator rights).
5.  Create **`quoted-message.tsx`** component for universal display/reuse (Reply flow and Thread flow).

### Step 2: Reaction and Pinning Feature Integration

1.  Add reaction button to actions menu.
2.  Create `message-reactions.tsx` for display.
3.  Connect to existing `ReactionViewer` and implement Socket emit/receive for realtime updates.
4.  Create `pinned-messages.tsx` component (collapsible UI).
5.  Implement Pin/Unpin API calls and Socket updates for pin changes.
6.  **[SECURITY] Ensure the Pin/Unpin API calls are made only after a client-side permission check, relying on Backend validation.**

### Step 3: Reply Flow and Exclusive State Management

1.  Create `reply-preview.tsx` above input.
2.  **[LOGIC] Define and manage `isReplying` state** in `chat-panel.tsx`.
3.  Implement state transition: Clicking Reply $\to$ Set `isReplying` state. Clicking X/Send $\to$ Clear `isReplying` state.
4.  Implement rendering of `quoted-message.tsx` inside the message bubble.
5.  Include `reply_to` when sending the final message.
6.  **[PERF] Implement scroll logic:** Detect click on `quoted-message.tsx`, check if the target message is loaded, and handle loading/scrolling accordingly.

### Step 4: Thread Panel and Realtime Logic

1.  Create **`thread-panel.tsx`** (side panel component).
2.  **[LOGIC] Define and manage `isThreadActive` state** in `chat-panel.tsx`.
3.  **[CRITICAL LOGIC] Implement mutual exclusivity:** Ensure the Input area only shows EITHER `reply-preview.tsx` OR the Thread Reply Input, but not both.
4.  Implement loading thread messages from API when clicking "Reply in thread".
5.  Implement real-time updates: When a reply is sent via socket, **only update the thread count badge on the parent message in the main chat view.**
6.  Implement thread input handling (ensuring every reply includes the correct `thread_id`).

### Step 5: Final UI Integration and Testing

1.  Final UI integration for thread count badge display on parent messages.
2.  Test permission checking logic for Pinning feature (Frontend and Backend interaction).
3.  Verify all Socket listeners handle state updates correctly for Reactions, Thread Count, and Pin status.
---

## 🔌 API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/messages/:id/reaction` | Add reaction |
| DELETE | `/messages/:id/reaction/:emoji` | Remove reaction |
| POST | `/messages` | Send with reply_to/thread_id |
| GET | `/messages/thread/:id` | Get thread messages |
| POST | `/conversations/:id/pin` | Pin message |
| DELETE | `/conversations/:id/pin/:msgId` | Unpin message |

---

## 🎨 UI Patterns

### Reaction Display
- Max 3 emoji types inline, "+N more" for others
- Tooltip shows users who reacted
- Click to toggle own reaction

### Reply Quote
- Subtle background color
- Max 2 lines with ellipsis
- Author name + avatar small
- Click to jump

### Thread Badge
- Show on parent message: "5 replies" with avatars
- Click opens thread panel

### Pinned Section
- Collapsible accordion
- Show 1-3 most recent
- "View all" for more

---

## ✅ Success Criteria (Revised)

- [x] Can add/remove reactions on any message, and they display correctly below the bubble.
- [x] **[LOGIC] Input State Exclusivity:** The input area maintains exclusive state: it is either in **Reply Preview mode** OR **Thread Reply mode**, but not both.
- [x] **Reply Flow:** Can successfully reply to a message, and the quoted message displays correctly with working **scroll-to-original** logic (handling loading state).
- [x] **Threading:** Can create/view threads, and the **thread count badge updates in realtime** on the parent message in the main chat view.
- [x] **Pinning:** Can pin/unpin messages only with valid permissions (Frontend **and** Backend validation), and the Pinned section shows at the top.
- [x] **Realtime:** All interactions (Reactions, Thread updates, Pin status) are updated immediately via socket.
- [x] **Cross-Compatibility:** All features work correctly in both direct and group chats.
- [x] No build errors and all new components are well-typed.
