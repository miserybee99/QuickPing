# Phase 4: Group Advanced Features

**Status:** ✅ Complete
**Priority:** 🟠 High
**Estimated:** 2-3 days

---

## 📋 Overview

Enhance group chat with settings modal, role management, and vote functionality.

---

## 🎯 Requirements

### 4.1 Group Settings Modal & Safety Logic
**Current:** `GroupSettingsModal` exists with basic fields
**Missing:** Some functionality may need enhancement

**Tasks:**
- [x] Verify all settings fields work.
- [x] Add member management section.
- [x] Leave group option.
- [x] Delete group (admin only).
- [ ] Notification settings per group. *(Deferred - low priority)*
- [x] **[SAFETY] Last Admin Constraint:** If the user is the last admin, they must either appoint a new admin OR delete the group (cannot simply leave).

**Files:**
- `components/modals/group-settings-modal.tsx` (enhance) ✅

### 4.2 Role Management & Confirmation
**Current:** `RoleManagementModal` exists
**Missing:** Integration and testing

**Tasks:**
- [x] Verify promote/demote works.
- [x] Permission checks (only admin can change roles).
- [x] Cannot demote last admin (Backend enforced).
- [x] **[UX] Show confirmation dialog** for high-risk actions: promoting/demoting roles, removing a member, and deleting the group.
- [x] Realtime update via socket.

**Files:**
- `components/modals/role-management-modal.tsx` (verify) ✅
- `components/chat/directory-panel.tsx` ✅

### 4.3 Vote Creation & Placement
**Current:** Backend API complete
**Missing:** UI to create votes

**Tasks:**
- [x] **[UX] Place "Create Vote" button** in a visible, accessible area (e.g., next to the file attachment icon or in an expanded input menu) in group chat.
- [x] Vote creation modal/form (`create-vote-modal.tsx`).
- [x] Vote question input, Add/remove options.
- [x] Single/multiple choice toggle, Expiry time setting, Anonymous voting option.
- [x] Form validation before calling `POST /votes` API.

**Files:**
- `components/modals/create-vote-modal.tsx` (new) ✅
- `components/chat/chat-panel.tsx` ✅

### 4.4 Vote Display & Interaction
**Current:** None
**Missing:** Vote card in message stream and interaction logic

**Tasks:**
- [x] Create core vote component: **`VoteOption.tsx`** (for consistent display of an option line).
- [x] Create `vote-message.tsx` card component.
- [x] Show question and options using `VoteOption.tsx`.
- [x] Handle vote clicks (Call `POST /votes/:id/vote` API).
- [x] Show vote count/percentage, Highlight voted option.
- [x] Show expiry countdown.
- [x] **[REALTIME] Implement client-side expiry logic:** Automatically switch the card to "Vote Ended" state when countdown hits zero, before waiting for socket confirmation.

**Files:**
- `components/chat/vote-message.tsx` (new) ✅
- `components/chat/chat-panel.tsx` ✅

### 4.5 Vote Results
**Current:** Backend has realtime results
**Missing:** UI display

**Tasks:**
- [x] Create `vote-results.tsx` (reusing `VoteOption.tsx`).
- [x] Progress bar for each option, Percentage display, Winner highlight.
- [x] Show "Vote ended" state.
- [x] View voters list (click option, if not anonymous).

**Files:**
- `components/chat/vote-results.tsx` (new) ✅

---

## 🏗 Architecture

```
Vote Creation Modal:
┌─────────────────────────────────────────────────────────┐
│ Create a Vote                                      [x]  │
├─────────────────────────────────────────────────────────┤
│ Question:                                               │
│ [What should we have for team lunch?          ]        │
│                                                         │
│ Options:                                                │
│ [1. Pizza                              ] [🗑]          │
│ [2. Sushi                              ] [🗑]          │
│ [3. Tacos                              ] [🗑]          │
│ [+ Add option]                                          │
│                                                         │
│ Settings:                                               │
│ ☑ Allow multiple selections                            │
│ ☐ Anonymous voting                                      │
│ Expires: [In 24 hours         ▼]                       │
│                                                         │
│                              [Cancel] [Create Vote]     │
└─────────────────────────────────────────────────────────┘

Vote Display in Chat:
┌─────────────────────────────────────────────────────────┐
│ 📊 Admin created a vote                                 │
├─────────────────────────────────────────────────────────┤
│ What should we have for team lunch?                     │
│                                                         │
│ ○ Pizza                    ████████████░░ 45% (5)      │
│ ● Sushi (your vote)        ████████░░░░░░ 36% (4)      │
│ ○ Tacos                    ████░░░░░░░░░░ 18% (2)      │
│                                                         │
│ 11 votes • Ends in 20 hours           [Change vote]    │
└─────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│              VOTE FEATURE ARCHITECTURE FLOW (Phase 4)   │
└─────────────────────────────────────────────────────────┘
+---------------------+-------------------+------------------+
|      FRONTEND (UI)      |   BACKEND (API/Socket)  |     COMPONENT LOGIC      |
+=========================+=========================+==================+
| [CHAT PANEL]            |                         |                  |
| 1. Click "Create Vote"  |                         |                  |
|   ───────────────────►| 2. Open CreateVoteModal |                  |
|                         |                         |                  |
| [CREATE VOTE MODAL]     |                         |                  |
| 3. Submit Form          | 4. POST /votes          |                  |
|   ───────────────────►| (Validate & Save)       |                  |
|                         | 5. Return Vote ID       |                  |
|   ◄───────────────────|                         |                  |
|                         | 6. Emit Socket Event    |                  |
|                         | (new_vote)              |                  |
| 7. Receive Socket Event |◄────────────────────────|                  |
|                         |                         | 8. Detect 'vote' type    |
| [CHAT MESSAGE STREAM]   |                         |   & Render VoteMessage   |
|                         |                         |                  |
| 9. User Clicks Option   |                         |                  |
|   ───────────────────►| 10. POST /votes/:id/vote| 11. Use VoteOption.tsx   |
|                         | (Update database)       |   for rendering lines    |
|                         | 12. Emit Socket Event   |                  |
| 13. Receive Socket      |◄────────────────────────|                  |
|    (vote_update)        |                         |                  |
| 14. Update Vote Counts  |                         | 15. Real-time Update     |
|    in VoteMessage       |                         |    (Counts, Percentages) |
|                         |                         |                  |
| 16. Expiry Countdown    |                         | 17. Client-side Logic:   |
|    Hits Zero            |                         |    Switch to "Ended" state |
|                         |                         |    (Display VoteResults) |
+---------------------+-------------------+------------------+
```

---

## 📝 Implementation Steps

### Step 1: Core Role Logic Verification & Safety Checks

1.  Test **GroupSettingsModal** and **RoleManagementModal** functionality.
2.  Implement **[SAFETY] Last Admin Constraint** logic (preventing the last admin from leaving without delegating).
3.  Implement **[UX] Confirmation Dialogs** for role changes, member removal, and group deletion.
4.  Ensure all role updates are handled via socket in realtime.

### Step 2: Vote Component Foundation

1.  Create the reusable core component: **`VoteOption.tsx`** (handling option text, progress bar display, vote count, and vote button).
2.  Create the result wrapper: **`vote-results.tsx`** (to display the final state using `VoteOption.tsx`).

### Step 3: Vote Creation and Message Display

1.  Create **`create-vote-modal.tsx`** with full form logic and validation.
2.  Implement **[UX] Button placement** and modal trigger in `chat-panel.tsx`.
3.  Call `POST /votes` API on submit.
4.  Create **`vote-message.tsx`** component to display the active vote in the chat stream, utilizing `VoteOption.tsx`.

### Step 4: Realtime Voting and Expiry

1.  Implement vote click handling in `vote-message.tsx` and call `POST /votes/:id/vote` API.
2.  Set up Socket listeners for vote updates (`vote_count_change`).
3.  Implement **[REALTIME] Client-side countdown and expiry** (auto-switching the component state to "Vote Ended" when time hits zero).
4.  Implement logic to switch `vote-message.tsx` to display `vote-results.tsx` when the vote is officially ended (either by expiry or manual action, confirmed via socket).

---

## 🔌 API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/votes` | Create vote |
| GET | `/votes/:id` | Get vote details |
| POST | `/votes/:id/vote` | Cast vote |
| GET | `/votes/:id/results` | Get results |
| PUT | `/conversations/:id/participants/:id/role` | Change role |
| DELETE | `/conversations/:id/participants/:id` | Remove member |

---

## 🎨 Vote States

| State | Display |
|-------|---------|
| Active | Can vote, show countdown |
| Voted | Highlight your choice, show "Change vote" |
| Ended | Show final results, winner badge |
| Anonymous | Hide voter names |

---

## ✅ Success Criteria

- [x] Group settings modal works fully, including member management.
- [x] **Role Management is safe:** Cannot demote last admin, and all high-risk role changes require **confirmation dialogs**.
- [x] **Vote Creation:** Can create votes with full settings (expiry, anonymity, multi-choice).
- [x] **Vote Display:** Vote displays correctly in chat using reusable components.
- [x] Can cast/change votes, and results update realtime via socket.
- [x] **Expiry Logic:** Vote automatically switches to "Ended" state when the client countdown hits zero.
- [x] Anonymous voting hides voter names correctly.
- [x] No build errors.
