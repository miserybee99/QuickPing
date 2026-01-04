# Phase 2: Frontend Components

**Duration:** 3-4 days  
**Status:** Pending  
**Dependencies:** Phase 1 complete

---

## Objectives

Build frontend UI components for deadline management:
- API client integration
- Calendar and list views
- Create/edit modals
- Real-time socket integration

---

## Tasks

### 2.1 API Client & Types

**File:** `frontend/types/index.ts`

**Add Deadline type:**
```typescript
export interface Deadline {
  _id: string;
  conversation_id: string | Conversation;
  created_by: string | User;
  title: string;
  description?: string;
  due_date: Date | string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  completed_by?: string | User;
  completed_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}
```

**File:** `frontend/lib/api-client.ts`

**Add deadlines object:**
```typescript
deadlines: {
  create: async (data: {
    conversation_id: string;
    title: string;
    description?: string;
    due_date: string; // ISO date string
    priority?: 'low' | 'medium' | 'high';
  }) => {
    return await api.post('/deadlines', data);
  },
  
  getByConversation: async (conversationId: string, filters?: {
    status?: string;
    priority?: string;
    sort?: 'due_date' | '-due_date';
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.sort) params.append('sort', filters.sort);
    return await api.get(`/deadlines/conversation/${conversationId}?${params}`);
  },
  
  getUserDeadlines: async () => {
    return await api.get('/deadlines/user');
  },
  
  getUpcoming: async () => {
    return await api.get('/deadlines/upcoming');
  },
  
  update: async (deadlineId: string, data: Partial<Deadline>) => {
    return await api.put(`/deadlines/${deadlineId}`, data);
  },
  
  delete: async (deadlineId: string) => {
    return await api.delete(`/deadlines/${deadlineId}`);
  },
}
```

**Checklist:**
- [ ] Add Deadline type
- [ ] Implement all API methods
- [ ] Add proper TypeScript typing
- [ ] Handle errors

---

### 2.2 Calendar Component

**File:** `frontend/components/deadlines/deadline-calendar.tsx`

**Features:**
- **Month view only** (no week/day views)
- Deadlines shown as dots/badges on dates
- Color coding by priority (red=high, yellow=medium, blue=low)
- Click date to show deadlines modal
- Click deadline to open detail

**Checklist:**
- [ ] Create component file
- [ ] Install calendar library (react-calendar or custom)
- [ ] Implement month view
- [ ] Add deadline indicators
- [ ] Add date click handler
- [ ] Style with app theme

---

### 2.3 List Component

**File:** `frontend/components/deadlines/deadline-list.tsx`

**Features:**
- Sortable table/list
- Filters: Status, Priority
- Columns: Title, Due Date, Priority, Status, Actions
- Group by date option

**Checklist:**
- [ ] Create component file
- [ ] Implement list/table UI
- [ ] Add sorting functionality
- [ ] Add filter dropdowns
- [ ] Add action buttons (Edit, Delete - admin only)
- [ ] **No complete button** (members are read-only)
- [ ] Show admin-only actions conditionally

---

### 2.4 Deadline Card Component

**File:** `frontend/components/deadlines/deadline-card.tsx`

**Features:**
- Display deadline info
- Priority badge
- Status badge
- Due date with countdown
- Action buttons: Edit (admin only), Delete (admin only)
- **No complete button** (members are read-only)

**Checklist:**
- [ ] Create component
- [ ] Style with shadcn/ui
- [ ] Add priority/status badges
- [ ] Calculate days until due
- [ ] Add action buttons (Edit, Delete - admin only)
- [ ] **No complete button**

---

### 2.5 Create Deadline Modal

**File:** `frontend/components/deadlines/create-deadline-modal.tsx`

**Features:**
- Form: Title (required), Description, Due Date, Priority
- Date picker
- Validation
- Submit to API
- Close on success

**Checklist:**
- [ ] Create modal component
- [ ] Add form fields
- [ ] Add date picker (react-datepicker)
- [ ] Add validation
- [ ] Handle submit
- [ ] Show loading states
- [ ] Handle errors

---

### 2.6 Detail/Edit Modal

**File:** `frontend/components/deadlines/deadline-detail-modal.tsx`

**Features:**
- View mode: Show all details (read-only for members)
- Edit mode: For admins only
- Admin can update status to 'completed' or 'cancelled' via edit form
- **No separate "Mark as complete" button**
- Delete button (admin only)

**Checklist:**
- [ ] Create modal
- [ ] Show deadline details
- [ ] Add edit mode toggle (admin only)
- [ ] Add status dropdown in edit mode (admin can change to completed/cancelled)
- [ ] Add delete confirmation (admin only)
- [ ] Handle all actions
- [ ] **No separate complete button**

---

### 2.7 DirectoryPanel Integration

**File:** `frontend/components/chat/directory-panel.tsx`

**Changes:**
- Add "Calendar" tab
- Import deadline components
- Fetch deadlines when tab active
- Show create button (admin only)
- Handle socket events

**Checklist:**
- [ ] Add Calendar tab
- [ ] Import components
- [ ] Add state for deadlines
- [ ] Fetch on tab switch
- [ ] Render calendar/list view
- [ ] Add create button
- [ ] Add socket listeners
- [ ] Update on socket events

---

### 2.8 Socket Integration

**Files:**
- `frontend/components/chat/directory-panel.tsx`
- `frontend/components/deadlines/deadline-calendar.tsx`

**Socket listeners:**
```typescript
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

**Checklist:**
- [ ] Add socket listeners in DirectoryPanel
- [ ] Update state on events
- [ ] Test with multiple clients
- [ ] Handle cleanup

---

## Deliverables

- ✅ API client with all methods
- ✅ Calendar component
- ✅ List component
- ✅ Card component
- ✅ Create modal
- ✅ Detail/edit modal
- ✅ DirectoryPanel integration
- ✅ Real-time updates working

---

## Notes

- Use shadcn/ui components for consistency
- Follow existing component patterns
- Ensure responsive design
- Add proper loading/error states

