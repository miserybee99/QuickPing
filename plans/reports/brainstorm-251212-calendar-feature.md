# Brainstorm Report: Calendar Feature for QuickPing

**Date:** 2025-12-12  
**Topic:** Calendar/Deadline Management Feature  
**Status:** Feasibility Analysis Complete

---

## Problem Statement

Thầy yêu cầu web phải có ít nhất một tính năng dành cho sinh viên. Nhóm đề xuất làm tính năng calendar với các yêu cầu:

1. **Trong mỗi nhóm**: Nhóm trưởng (admin) có thể đặt deadline cho nhóm
2. **Calendar trong nhóm**: Hiển thị danh sách deadline của nhóm đó
3. **Trang chủ**: Tổng hợp deadline của tất cả các nhóm mà user tham gia

---

## Architecture Analysis

### Current State Assessment

**✅ Existing Infrastructure:**
- ✅ MongoDB với schema linh hoạt
- ✅ Socket.io đã được setup cho real-time updates
- ✅ Group conversations với role-based access (admin/moderator/member)
- ✅ RESTful API architecture sẵn sàng mở rộng
- ✅ Frontend structure rõ ràng với Next.js
- ✅ Authentication & authorization đã có sẵn

**📊 Database Models:**
- `Conversation` model hỗ trợ `type: 'group'` với `participants` array có roles
- `created_by` field đã có để track người tạo
- `settings` Map field có thể mở rộng

**🔌 Real-time Capabilities:**
- Socket.io đã có events cho messages, votes, reactions
- Pattern sẵn có: `vote_created`, `vote_updated`, `vote_deleted`
- Room-based broadcasting: `conversation_{id}` rooms

---

## Feasibility Assessment: **✅ HIGHLY FEASIBLE**

### Why It's Feasible

1. **Kiến trúc phù hợp**: Group-based structure đã có, chỉ cần thêm deadline layer
2. **Pattern tương tự**: Vote system là reference tốt (group-scoped, role-based, real-time)
3. **Infrastructure sẵn có**: Database, real-time, auth - không cần setup mới
4. **Scope hợp lý**: Feature đủ nhỏ để implement trong timeline, đủ lớn để thể hiện technical skills

### Estimated Complexity: **Medium** (7/10)

**Time Estimate:**
- Backend: 2-3 days
- Frontend: 3-4 days
- Testing & Polish: 1-2 days
- **Total: 6-9 days** (1.5-2 weeks với team 2-3 người)

---

## Proposed Solution Architecture

### Option 1: Deadline Model (Recommended)

**Approach:** Tạo model `Deadline` riêng, tương tự `Vote` model

**Database Schema:**
```javascript
Deadline {
  conversation_id: ObjectId (ref: Conversation),
  created_by: ObjectId (ref: User),
  title: String,
  description: String (optional),
  due_date: Date,
  priority: 'low' | 'medium' | 'high',
  status: 'pending' | 'completed' | 'cancelled',
  assigned_to: [ObjectId] (ref: User) // Optional: assign to specific members
  reminders: [{
    sent_at: Date,
    reminder_type: 'day_before' | 'hour_before' | 'custom'
  }],
  completed_by: ObjectId (ref: User),
  completed_at: Date,
  created_at: Date,
  updated_at: Date
}
```

**Pros:**
- ✅ Separation of concerns (deadline ≠ message)
- ✅ Easy to query và filter
- ✅ Có thể extend (reminders, notifications, completion tracking)
- ✅ Follow existing pattern (Vote model)
- ✅ Dễ maintain và scale

**Cons:**
- ⚠️ Cần thêm model mới
- ⚠️ Cần migration nếu có data cũ

---

### Option 2: System Messages (Alternative)

**Approach:** Store deadlines như system messages với special type

**Pros:**
- ✅ Tận dụng Message model hiện có
- ✅ Hiển thị trong chat timeline
- ✅ Minimal code changes

**Cons:**
- ❌ Mix concerns (message logic với deadline logic)
- ❌ Khó query deadlines riêng biệt
- ❌ Calendar view sẽ phức tạp hơn
- ❌ Không clean architecture

**Verdict:** ❌ **KHÔNG KHUYẾN NGHỊ** - Vi phạm Single Responsibility Principle

---

## Implementation Plan

### Phase 1: Backend Foundation (2-3 days)

**1.1 Database Model**
- [ ] Create `Deadline` model (`backend/models/Deadline.js`)
- [ ] Add indexes: `conversation_id`, `due_date`, `status`
- [ ] Validation: due_date phải trong tương lai

**1.2 API Endpoints** (`backend/routes/deadlines.js`)
- [ ] `POST /api/deadlines` - Create deadline (chỉ admin/moderator)
- [ ] `GET /api/deadlines/conversation/:id` - Get deadlines của group
- [ ] `GET /api/deadlines/user` - Get all deadlines của user (across groups)
- [ ] `PUT /api/deadlines/:id` - Update deadline (chỉ creator/admin)
- [ ] `DELETE /api/deadlines/:id` - Delete deadline
- [ ] `POST /api/deadlines/:id/complete` - Mark as completed
- [ ] `GET /api/deadlines/upcoming` - Get upcoming deadlines (homepage)

**1.3 Real-time Integration**
- [ ] Socket event: `deadline_created` → emit to `conversation_{id}` room
- [ ] Socket event: `deadline_updated` → emit when status/date changes
- [ ] Socket event: `deadline_deleted` → emit when deleted
- [ ] Modify `socket.js` để handle các events này

**1.4 Authorization**
- [ ] Middleware: Check user role (admin/moderator) cho create
- [ ] Check participant membership cho read
- [ ] Check creator hoặc admin cho update/delete

---

### Phase 2: Frontend Components (3-4 days)

**2.1 Calendar UI Components**
- [ ] `DeadlineCalendar.tsx` - Calendar view component
- [ ] `DeadlineList.tsx` - List view với sort/filter
- [ ] `DeadlineCard.tsx` - Individual deadline card
- [ ] `CreateDeadlineModal.tsx` - Modal để tạo deadline
- [ ] `DeadlineDetailModal.tsx` - View/edit deadline details

**2.2 Integration Points**
- [ ] Add "Calendar" tab trong `DirectoryPanel` (bên cạnh Files, Members)
- [ ] Homepage section: "Upcoming Deadlines" với aggregation
- [ ] Real-time updates: Listen socket events và update UI

**2.3 API Client** (`frontend/lib/api-client.ts`)
- [ ] Add `deadlines` object với các methods:
  - `create()`, `getByConversation()`, `getUserDeadlines()`, `getUpcoming()`, `update()`, `delete()`, `complete()`

---

### Phase 3: Homepage Integration (1 day)

**3.1 Homepage Calendar Section**
- [ ] Component: `UpcomingDeadlines.tsx`
- [ ] Fetch từ `/api/deadlines/upcoming`
- [ ] Group by date hoặc group
- [ ] Link đến group calendar khi click

**3.2 Navigation**
- [ ] Add calendar icon trong sidebar (nếu cần)
- [ ] Quick access từ homepage

---

## Technical Considerations

### Real-time Updates Pattern

**Follow Vote Pattern:**
```javascript
// Backend: routes/deadlines.js
router.post('/', authenticate, async (req, res) => {
  const deadline = await Deadline.create(...);
  
  // Emit to conversation room
  const io = req.app.get('io');
  if (io) {
    io.to(`conversation_${deadline.conversation_id}`).emit('deadline_created', {
      conversation_id: deadline.conversation_id,
      deadline: deadline
    });
  }
  
  res.json({ deadline });
});

// Frontend: chat-panel.tsx or directory-panel.tsx
useEffect(() => {
  if (!socket) return;
  
  socket.on('deadline_created', (data) => {
    if (data.conversation_id === conversationId) {
      setDeadlines(prev => [...prev, data.deadline]);
    }
  });
  
  socket.on('deadline_updated', (data) => {
    setDeadlines(prev => prev.map(d => 
      d._id === data.deadline_id ? data.deadline : d
    ));
  });
  
  return () => {
    socket.off('deadline_created');
    socket.off('deadline_updated');
  };
}, [socket, conversationId]);
```

---

### Database Query Optimization

**Indexes cần thiết:**
```javascript
deadlineSchema.index({ conversation_id: 1, due_date: 1 });
deadlineSchema.index({ created_by: 1, due_date: 1 });
deadlineSchema.index({ due_date: 1, status: 1 }); // For upcoming query
```

**Homepage Aggregation Query:**
```javascript
// GET /api/deadlines/upcoming
const userId = req.user._id;
const userConversations = await Conversation.find({
  'participants.user_id': userId
}).select('_id');

const conversationIds = userConversations.map(c => c._id);

const upcomingDeadlines = await Deadline.find({
  conversation_id: { $in: conversationIds },
  due_date: { $gte: new Date() },
  status: 'pending'
})
.sort({ due_date: 1 })
.limit(10)
.populate('conversation_id', 'name avatar_url')
.populate('created_by', 'username avatar_url');
```

---

### UI/UX Considerations

**Calendar View:**
- Month view với color coding theo priority
- Click date → show deadlines của ngày đó
- Click deadline → open detail modal

**List View:**
- Sort by: Date, Priority, Group
- Filter: Pending, Completed, Overdue
- Quick actions: Complete, Edit, Delete

**Homepage:**
- Compact list: Next 7 days
- Badge count cho overdue deadlines
- Group by: Today, This Week, Later

---

## Risks & Mitigation

### Risk 1: Performance với nhiều groups
**Impact:** Medium  
**Mitigation:**
- Pagination cho homepage query
- Lazy load calendar view
- Cache deadlines trong frontend state

### Risk 2: Real-time sync issues
**Impact:** Low (pattern đã proven với Vote)  
**Mitigation:**
- Follow exact Vote pattern
- Test với multiple concurrent users

### Risk 3: Timezone handling
**Impact:** Medium  
**Mitigation:**
- Store UTC trong DB
- Convert to user timezone ở frontend
- Use `Intl.DateTimeFormat` hoặc `date-fns-tz`

### Risk 4: Over-engineering
**Impact:** Medium  
**Mitigation:**
- **YAGNI**: Start simple (basic CRUD + calendar view)
- Skip advanced features (reminders, recurring) cho MVP
- Add later nếu cần

---

## Alternative Approaches (Considered & Rejected)

### Alternative 1: Third-party Calendar Integration (Google Calendar)
**Rejected because:**
- ❌ Phụ thuộc external service
- ❌ OAuth complexity
- ❌ Không control được UX
- ❌ Violates requirement (phải là tính năng của web)

### Alternative 2: Event-based System (tổng quát hơn Deadline)
**Rejected because:**
- ❌ Scope creep (event ≠ deadline)
- ❌ Over-engineering cho requirement hiện tại
- ❌ Timeline không đủ

---

## Success Criteria

### Must Have (MVP):
- [ ] Admin/moderator tạo được deadline trong group
- [ ] Calendar view trong group hiển thị deadlines
- [ ] Homepage tổng hợp deadlines của user
- [ ] Real-time updates khi có thay đổi
- [ ] Mark deadline as completed

### Nice to Have (Future):
- [ ] Reminder notifications (email/push)
- [ ] Recurring deadlines
- [ ] Assign deadlines to specific members
- [ ] Deadline templates
- [ ] Export calendar (iCal format)

---

## Recommendations

### ✅ **PROCEED với Option 1 (Deadline Model)**

**Rationale:**
1. **Clean Architecture**: Follow existing patterns, maintainable
2. **Right Level of Complexity**: Đủ để demonstrate skills, không quá phức tạp
3. **Scalable**: Dễ extend sau này (reminders, notifications)
4. **Proven Pattern**: Similar to Vote system - team đã quen

### Implementation Priority:

**Week 1:**
- Day 1-2: Backend model + basic CRUD endpoints
- Day 3-4: Frontend components + group calendar view
- Day 5: Homepage integration + real-time

**Week 2:**
- Day 1-2: Polish UI/UX, testing
- Day 3: Bug fixes, edge cases
- Day 4-5: Documentation, demo prep

### Technical Debt Considerations:
- ⚠️ Consider adding `deadline_count` field vào Conversation model để optimize queries (có thể skip cho MVP)
- ⚠️ Notification system chưa có - có thể dùng email service hiện có sau này

---

## Questions for Clarification

Trước khi implement, cần clarify:

1. **Permissions:**
   - Chỉ admin tạo deadline, hay moderator cũng được?
   - Member có thể mark complete không, hay chỉ admin?

2. **UI Placement:**
   - Calendar ở đâu trong group? Tab riêng trong DirectoryPanel?
   - Homepage: Sidebar widget hay main section?

3. **Deadline Types:**
   - Chỉ assignment deadlines, hay cả events/meetings?
   - Có cần recurring deadlines không?

4. **Notifications:**
   - Có cần email reminders không?
   - Push notifications trong app?

5. **Completion:**
   - Ai có thể mark complete?
   - Có cần approval workflow không?

---

## Final Verdict

**✅ FEASIBLE và RECOMMENDED**

Calendar feature là lựa chọn tốt vì:
- ✅ Phù hợp với kiến trúc hiện tại
- ✅ Timeline hợp lý (1.5-2 weeks)
- ✅ Demonstrate technical skills (real-time, aggregation, role-based access)
- ✅ Useful feature cho target audience (sinh viên)
- ✅ Dễ extend và maintain

**Next Steps:**
1. Confirm requirements với team
2. Create detailed implementation plan
3. Setup development branch
4. Start với backend model + basic CRUD

---

**Report prepared by:** AI Assistant (Brainstorm Agent)  
**Review status:** Ready for team discussion

