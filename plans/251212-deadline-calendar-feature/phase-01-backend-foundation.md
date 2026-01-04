# Phase 1: Backend Foundation

**Duration:** 2-3 days  
**Status:** Pending

---

## Objectives

Create backend infrastructure for deadline management:
- Database model with proper indexes
- REST API endpoints with admin-only creation
- Socket.io integration for real-time updates
- Authorization middleware

---

## Tasks

### 1.1 Create Deadline Model

**File:** `backend/models/Deadline.js`

```javascript
import mongoose from 'mongoose';

const deadlineSchema = new mongoose.Schema({
  conversation_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000,
    default: ''
  },
  due_date: {
    type: Date,
    required: true,
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  completed_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completed_at: {
    type: Date
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Compound indexes for efficient queries
deadlineSchema.index({ conversation_id: 1, due_date: 1 });
deadlineSchema.index({ due_date: 1, status: 1 });

// Virtual for overdue check
deadlineSchema.virtual('is_overdue').get(function() {
  return this.status === 'pending' && this.due_date < new Date();
});

// Pre-save hook
deadlineSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

export default mongoose.model('Deadline', deadlineSchema);
```

**Checklist:**
- [ ] Create model file
- [ ] Add schema with all fields
- [ ] Add indexes
- [ ] Add virtuals
- [ ] Add validation hooks
- [ ] Test model creation

---

### 1.2 Create API Routes

**File:** `backend/routes/deadlines.js`

**Authorization Helper:**
```javascript
// Check if user is admin of conversation
async function checkAdmin(conversationId, userId) {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) return false;
  
  const participant = conversation.participants.find(
    p => p.user_id.toString() === userId.toString()
  );
  
  return participant?.role === 'admin';
}
```

**Endpoints to implement:**

1. **POST `/api/deadlines`**
   - Validate: `conversation_id`, `title`, `due_date` required
   - Check: User is admin
   - Validate: `due_date` is in future
   - Create deadline
   - Emit socket: `deadline_created`
   - Return deadline

2. **GET `/api/deadlines/conversation/:conversationId`**
   - Check: User is participant
   - Query deadlines for conversation
   - Filter by status, priority (query params)
   - Sort by due_date
   - Populate: `created_by`, `completed_by`
   - Return deadlines

3. **GET `/api/deadlines/user`**
   - Get all conversations user participates in
   - Query deadlines for those conversations
   - Filter: `status: 'pending'`, `due_date >= today`
   - Sort by due_date ASC
   - Populate: `conversation_id`, `created_by`
   - Return deadlines

4. **GET `/api/deadlines/upcoming`**
   - Similar to `/user` but optimized
   - Limit to 20 most urgent
   - Group by date

5. **PUT `/api/deadlines/:deadlineId`**
   - Check: User is admin OR creator
   - Update deadline fields
   - **Admin can update status to 'completed' or 'cancelled'**
   - Set `completed_by` and `completed_at` when status changes to 'completed'
   - Emit socket: `deadline_updated`
   - Return updated deadline

6. **DELETE `/api/deadlines/:deadlineId`**
   - Check: User is admin OR creator
   - Delete deadline
   - Emit socket: `deadline_deleted`
   - Return success

**Checklist:**
- [ ] Create routes file
- [ ] Implement authorization helpers
- [ ] Add express-validator validation
- [ ] Implement all 6 endpoints (no separate complete endpoint)
- [ ] Allow admin to update status via PUT endpoint
- [ ] Add error handling
- [ ] Add socket emissions
- [ ] Register routes in `server.js`

---

### 1.3 Socket.io Integration

**File:** `backend/routes/deadlines.js`

**Socket emission pattern:**
```javascript
// In route handlers, after DB operation
const io = req.app.get('io');
if (io) {
  const room = `conversation_${deadline.conversation_id}`;
  io.to(room).emit('deadline_created', {
    conversation_id: deadline.conversation_id.toString(),
    deadline: deadline.toObject()
  });
}
```

**Events to emit:**
- `deadline_created` - After POST
- `deadline_updated` - After PUT or complete
- `deadline_deleted` - After DELETE

**Checklist:**
- [ ] Get io instance from req.app.get('io')
- [ ] Emit events after create
- [ ] Emit events after update
- [ ] Emit events after delete
- [ ] Test socket emissions

---

### 1.4 Testing

**Manual Testing:**
- [ ] Test admin can create deadline
- [ ] Test non-admin cannot create
- [ ] Test member can view deadlines
- [ ] Test member can complete deadline
- [ ] Test admin can update/delete
- [ ] Test creator can update/delete
- [ ] Test socket events work
- [ ] Test homepage query

**Checklist:**
- [ ] Test all endpoints with Postman/curl
- [ ] Test authorization edge cases
- [ ] Test socket real-time updates
- [ ] Fix any bugs

---

## Deliverables

- ✅ Deadline model with indexes
- ✅ 7 REST API endpoints
- ✅ Socket.io real-time events
- ✅ Authorization working correctly
- ✅ All tests passing

---

## Notes

- Follow Vote model pattern for consistency
- Ensure proper error messages
- Log socket emissions for debugging
- Consider pagination for large queries

