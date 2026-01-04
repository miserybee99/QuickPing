# Implementation Plan: Deadline Calendar Feature

**Feature:** Calendar/Deadline Management System  
**Approach:** Option 1 - Dedicated Deadline Model  
**Constraint:** Only admins can create deadlines  
**Created:** 2025-12-12  
**Status:** Planning

---

## Overview

Implement calendar feature allowing group admins to create deadlines for their groups. Members can view deadlines in group calendar and see aggregated deadlines on homepage.

**Key Requirements:**
- ✅ Only **admins** can create/edit/delete deadlines (NOT moderators)
- ✅ Members can **only view** deadlines (read-only access)
- ✅ Real-time updates via Socket.io
- ✅ Group calendar view (month view only) + Homepage aggregation
- ✅ No notifications/reminders for MVP

---

## Phase 1: Backend Foundation

### 1.1 Database Model

**File:** `backend/models/Deadline.js`

**Schema:**
```javascript
{
  conversation_id: ObjectId (ref: Conversation, required, indexed),
  created_by: ObjectId (ref: User, required),
  title: String (required, max 200 chars),
  description: String (optional, max 1000 chars),
  due_date: Date (required, indexed),
  priority: 'low' | 'medium' | 'high' (default: 'medium'),
  status: 'pending' | 'completed' | 'cancelled' (default: 'pending', indexed),
  completed_by: ObjectId (ref: User),
  completed_at: Date,
  created_at: Date (default: now),
  updated_at: Date (default: now)
}
```

**Tasks:**
- [ ] Create model file with schema
- [ ] Add validation: `due_date` must be in future for creation
- [ ] Add indexes: `{ conversation_id: 1, due_date: 1 }`, `{ due_date: 1, status: 1 }`
- [ ] Add pre-save hook to update `updated_at`
- [ ] Add virtuals: `is_overdue`, `days_until_due`

---

### 1.2 API Routes

**File:** `backend/routes/deadlines.js`

**Authorization Rules:**
- **Create:** Only admin of the group
- **Read:** Any participant of the group (read-only for members)
- **Update/Delete:** Only admin OR creator
- **Status Update:** Only admin can update status (including marking as completed via PUT endpoint)

**Endpoints:**

1. **POST `/api/deadlines`** - Create deadline
   - Middleware: `authenticate`
   - Validation: `conversation_id`, `title`, `due_date` required
   - Authorization: Check user is admin of the conversation
   - Emit socket: `deadline_created` to `conversation_{id}` room

2. **GET `/api/deadlines/conversation/:conversationId`** - Get group deadlines
   - Middleware: `authenticate`
   - Authorization: Check user is participant
   - Query params: `status`, `priority`, `sort` (due_date)
   - Populate: `created_by`, `completed_by` (if status is completed)

3. **GET `/api/deadlines/user`** - Get all user deadlines (homepage)
   - Middleware: `authenticate`
   - Get all conversations user participates in
   - Filter: `due_date >= today`, `status: 'pending'`
   - Populate: `conversation_id` (name, avatar_url), `created_by`

4. **GET `/api/deadlines/upcoming`** - Get upcoming deadlines (optimized for homepage)
   - Middleware: `authenticate`
   - Limit: 20 most urgent
   - Sort: `due_date ASC`
   - Group by conversation for better UX

5. **PUT `/api/deadlines/:deadlineId`** - Update deadline
   - Middleware: `authenticate`
   - Authorization: Check user is admin OR creator
   - Admin can update status to 'completed' or 'cancelled'
   - Set `completed_by` and `completed_at` when status changes to 'completed'
   - Emit socket: `deadline_updated`

6. **DELETE `/api/deadlines/:deadlineId`** - Delete deadline
   - Middleware: `authenticate`
   - Authorization: Check user is admin OR creator
   - Emit socket: `deadline_deleted`

**Tasks:**
- [ ] Create routes file
- [ ] Implement authorization helpers (check admin, check participant)
- [ ] Add validation middleware (express-validator)
- [ ] Implement 6 endpoints (no separate complete endpoint)
- [ ] Admin can update status to 'completed' via PUT endpoint
- [ ] Add socket emission after create/update/delete
- [ ] Register routes in `backend/server.js`

---

### 1.3 Socket.io Integration

**File:** `backend/socket/socket.js`

**Events to handle:**

1. **Client → Server:** None (all via REST API)

2. **Server → Client:**
   - `deadline_created` - New deadline created
   - `deadline_updated` - Deadline updated (including status changes by admin)
   - `deadline_deleted` - Deadline deleted

**Implementation:**
- Emit events from route handlers after DB operations
- Broadcast to `conversation_{id}` room
- Include full deadline object in payload

**Tasks:**
- [ ] Verify socket.io setup in route handlers (get `io` from `req.app.get('io')`)
- [ ] Test event emission from deadline routes
- [ ] Ensure proper room broadcasting

---

### 1.4 Authorization Helpers

**File:** `backend/middleware/auth.js` or new `backend/middleware/deadlineAuth.js`

**Functions:**
- `checkDeadlineAdmin(req, res, next)` - Verify user is admin of deadline's conversation
- `checkDeadlineParticipant(req, res, next)` - Verify user is participant
- `checkDeadlineCreatorOrAdmin(req, res, next)` - Verify user is creator OR admin

**Tasks:**
- [ ] Create authorization helper functions
- [ ] Reuse existing conversation participant checking logic
- [ ] Add proper error messages

---

## Phase 2: Frontend Implementation

### 2.1 API Client

**File:** `frontend/lib/api-client.ts`

**Add to `apiClient` object:**
```typescript
deadlines: {
  create: (data: CreateDeadlineData) => Promise<Response>
  getByConversation: (conversationId: string, filters?) => Promise<Response>
  getUserDeadlines: () => Promise<Response>
  getUpcoming: () => Promise<Response>
  update: (deadlineId: string, data: UpdateDeadlineData) => Promise<Response>
  delete: (deadlineId: string) => Promise<Response>
}
```

**Types:** Add to `frontend/types/index.ts`
```typescript
export interface Deadline {
  _id: string;
  conversation_id: string | Conversation;
  created_by: string | User;
  title: string;
  description?: string;
  due_date: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  completed_by?: string | User;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
}
```

**Tasks:**
- [ ] Add Deadline type to `types/index.ts`
- [ ] Implement 6 API client methods (no `complete` method)
- [ ] Add proper TypeScript typing
- [ ] Handle errors appropriately

---

### 2.2 Group Calendar Components

**Location:** `frontend/components/deadlines/`

**Components:**

1. **`DeadlineCalendar.tsx`** - Main calendar view
   - **Month view only** (no week/day views)
   - Deadline indicators on dates
   - Click date to show deadlines
   - Color coding by priority
   - Navigate between months

2. **`DeadlineList.tsx`** - List view
   - Sortable columns: Title, Due Date, Priority, Status
   - Filters: Status, Priority
   - Group by date or show flat list

3. **`DeadlineCard.tsx`** - Individual deadline display
   - Show title, description, due date, priority
   - Status badge (pending/completed/cancelled)
   - Actions: Edit (if admin), Delete (if admin)
   - **No complete button** (members are read-only)

4. **`CreateDeadlineModal.tsx`** - Modal to create deadline
   - Form fields: Title, Description, Due Date, Priority
   - Date picker component
   - Validation
   - Only show for admins

5. **`DeadlineDetailModal.tsx`** - View/edit deadline
   - Show full details (read-only for members)
   - Edit mode for admins only
   - Admin can update status to 'completed' or 'cancelled' via edit form
   - **No separate "Mark as complete" button**

**Tasks:**
- [ ] Create component directory structure
- [ ] Implement all components with proper styling
- [ ] Integrate with API client
- [ ] Add loading states and error handling
- [ ] Use shadcn/ui components for consistency

---

### 2.3 DirectoryPanel Integration

**File:** `frontend/components/chat/directory-panel.tsx`

**Changes:**
- Add "Calendar" tab alongside "Files" and "Members"
- Tab content: Render `DeadlineCalendar` or `DeadlineList`
- Add "Create Deadline" button (only for admins)
- Show deadline count badge

**Tasks:**
- [ ] Add Calendar tab to DirectoryPanel
- [ ] Fetch deadlines when tab is active
- [ ] Handle tab switching
- [ ] Add real-time updates via socket listeners
- [ ] Show admin-only UI elements conditionally

---

### 2.4 Real-time Socket Integration

**Files:** 
- `frontend/components/chat/directory-panel.tsx`
- `frontend/components/deadlines/DeadlineCalendar.tsx`

**Socket Event Handlers:**
```typescript
// In DirectoryPanel or DeadlineCalendar component
useEffect(() => {
  if (!socket || !conversationId) return;

  const handleDeadlineCreated = (data: { conversation_id: string; deadline: Deadline }) => {
    if (data.conversation_id === conversationId) {
      setDeadlines(prev => [...prev, data.deadline]);
    }
  };

  const handleDeadlineUpdated = (data: { conversation_id: string; deadline: Deadline }) => {
    if (data.conversation_id === conversationId) {
      setDeadlines(prev => prev.map(d => 
        d._id === data.deadline._id ? data.deadline : d
      ));
    }
  };

  const handleDeadlineDeleted = (data: { deadline_id: string; conversation_id: string }) => {
    if (data.conversation_id === conversationId) {
      setDeadlines(prev => prev.filter(d => d._id !== data.deadline_id));
    }
  };

  socket.on('deadline_created', handleDeadlineCreated);
  socket.on('deadline_updated', handleDeadlineUpdated);
  socket.on('deadline_deleted', handleDeadlineDeleted);

  return () => {
    socket.off('deadline_created', handleDeadlineCreated);
    socket.off('deadline_updated', handleDeadlineUpdated);
    socket.off('deadline_deleted', handleDeadlineDeleted);
  };
}, [socket, conversationId]);
```

**Tasks:**
- [ ] Add socket listeners in DirectoryPanel
- [ ] Update local state on socket events
- [ ] Test real-time updates with multiple clients
- [ ] Handle edge cases (component unmount, socket disconnect)

---

## Phase 3: Homepage Integration

### 3.1 Upcoming Deadlines Component

**File:** `frontend/app/(chat)/page.tsx` or new component

**Component:** `UpcomingDeadlines.tsx`
- Fetch from `/api/deadlines/upcoming`
- Display as cards or list
- Group by date (Today, Tomorrow, This Week, Later)
- Show conversation name and deadline title
- Link to group when clicked
- **Overdue deadlines displayed normally** (same styling as regular deadlines)

**Tasks:**
- [ ] Create UpcomingDeadlines component
- [ ] Integrate into homepage layout
- [ ] Add loading and error states
- [ ] Style consistently with app design
- [ ] Add navigation to group calendar on click

---

### 3.2 Navigation Updates

**Optional enhancements:**
- Add calendar icon to sidebar
- Quick access from homepage to deadlines

**Tasks:**
- [ ] Decide on navigation pattern
- [ ] Implement if needed

---

## Phase 4: Testing & Polish

### 4.1 Backend Testing

**Test Cases:**
- [ ] Admin can create deadline
- [ ] Non-admin cannot create deadline
- [ ] Member can view deadlines (read-only)
- [ ] Member **cannot** update/delete deadlines
- [ ] Admin can update/delete deadline
- [ ] Admin can update status to 'completed' via PUT endpoint
- [ ] Creator can update/delete their deadline
- [ ] Socket events emit correctly
- [ ] Homepage aggregation works correctly
- [ ] Query performance with many deadlines

**Tasks:**
- [ ] Manual testing of all endpoints
- [ ] Test authorization edge cases
- [ ] Test socket real-time updates
- [ ] Load testing for homepage query

---

### 4.2 Frontend Testing

**Test Cases:**
- [ ] Calendar displays correctly (month view only)
- [ ] List view works with filters/sort
- [ ] Create deadline modal (admin only)
- [ ] **No complete button visible to members**
- [ ] Edit/Delete buttons only visible to admins
- [ ] Real-time updates work
- [ ] Homepage aggregation displays
- [ ] Navigation works correctly
- [ ] Responsive design on mobile

**Tasks:**
- [ ] Manual testing of all UI components
- [ ] Test with multiple users simultaneously
- [ ] Test on different screen sizes
- [ ] Fix any UI/UX issues

---

### 4.3 Edge Cases & Error Handling

**Edge Cases:**
- [ ] User leaves group → deadlines no longer visible
- [ ] Deadline due_date in past → show normally (same styling)
- [ ] Completed deadline → filter out from upcoming (only show pending)
- [ ] Socket disconnect → graceful degradation
- [ ] Large number of deadlines → pagination

**Tasks:**
- [ ] Handle all edge cases
- [ ] Add proper error messages
- [ ] Add loading states everywhere
- [ ] Handle network failures gracefully

---

## Implementation Timeline

### Week 1: Backend
- **Day 1:** Model + basic CRUD endpoints
- **Day 2:** Authorization + socket integration
- **Day 3:** Homepage aggregation + testing

### Week 2: Frontend
- **Day 1:** API client + basic components
- **Day 2:** Calendar view + list view
- **Day 3:** DirectoryPanel integration
- **Day 4:** Homepage integration + real-time
- **Day 5:** Testing + polish

---

## Dependencies

**Backend:**
- ✅ Express, Mongoose (existing)
- ✅ Socket.io (existing)
- ✅ express-validator (existing)

**Frontend:**
- ✅ Next.js, React (existing)
- ✅ Socket.io-client (existing)
- ⚠️ Date picker library (need to add: `react-datepicker` or `@radix-ui/react-calendar`)
- ⚠️ Calendar library for month view (optional: `react-calendar` or custom)

---

## Risks & Mitigation

1. **Performance:** Many deadlines per group
   - Mitigation: Pagination, indexes, limit homepage query

2. **Timezone:** Users in different timezones
   - Mitigation: Store UTC, convert in frontend, use date-fns-tz

3. **Real-time sync:** Socket issues
   - Mitigation: Follow proven Vote pattern, test thoroughly

4. **UI complexity:** Calendar component
   - Mitigation: Use existing library, **month view only** (simplified requirement)

---

## Success Criteria

**Must Have:**
- ✅ Admin can create deadlines
- ✅ Calendar view in group (month view only)
- ✅ Homepage aggregation
- ✅ Real-time updates
- ✅ Members can view deadlines (read-only)
- ✅ Admin can update status (including marking as completed)

**Nice to Have (Future):**
- Notifications/reminders (not in MVP)
- Recurring deadlines
- Export calendar (iCal format)
- Week/day calendar views

---

## Open Questions - Answered ✅

1. **Should completed deadlines appear in calendar or be hidden?**
   - ✅ **Answer:** Completed deadlines will appear in calendar (same display), but filtered out from "upcoming" query on homepage

2. **Should we show overdue deadlines differently?**
   - ✅ **Answer:** No, overdue deadlines displayed normally (same styling as regular deadlines)

3. **Do we need deadline notifications/reminders for MVP?**
   - ✅ **Answer:** No, notifications/reminders not included in MVP

4. **Calendar view: Month view only or also week/day view?**
   - ✅ **Answer:** **Month view only** (simplified requirement)

5. **Should members be able to mark as complete?**
   - ✅ **Answer:** **No**, members are read-only. Only admins can update deadline status (including marking as completed via PUT endpoint)

---

**Plan Status:** Ready for implementation  
**Next Step:** Start with Phase 1.1 - Database Model

