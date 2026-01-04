# Phase 3: Homepage Integration

**Duration:** 1 day  
**Status:** Pending  
**Dependencies:** Phase 2 complete

---

## Objectives

Add deadline aggregation to homepage:
- Upcoming deadlines component
- Show deadlines from all user's groups
- Navigate to group calendar on click

---

## Tasks

### 3.1 Upcoming Deadlines Component

**File:** `frontend/components/deadlines/upcoming-deadlines.tsx`

**Features:**
- Fetch from `/api/deadlines/upcoming`
- Display as cards or list
- Group by: Today, Tomorrow, This Week, Later
- Show: Conversation name, deadline title, due date
- **Overdue deadlines displayed normally** (same styling, no special badge)
- **Completed deadlines filtered out** (only show pending)
- Link to conversation on click

**Component structure:**
```typescript
export function UpcomingDeadlines() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const fetchUpcoming = async () => {
    try {
      const response = await apiClient.deadlines.getUpcoming();
      setDeadlines(response.data.deadlines || []);
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (deadlines: Deadline[]) => {
    // Group logic: today, tomorrow, this week, later
    // Note: Overdue deadlines displayed normally (no special styling)
    // Completed deadlines already filtered by backend query (status: 'pending')
  };

  const handleClick = (deadline: Deadline) => {
    const conversationId = typeof deadline.conversation_id === 'string' 
      ? deadline.conversation_id 
      : deadline.conversation_id._id;
    router.push(`/?conversation=${conversationId}`);
  };

  // Render grouped deadlines
}
```

**Checklist:**
- [ ] Create component file
- [ ] Fetch upcoming deadlines
- [ ] Implement grouping logic
- [ ] Create UI for grouped display
- [ ] Add navigation on click
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style consistently

---

### 3.2 Homepage Integration

**File:** `frontend/app/(chat)/page.tsx`

**Integration:**
- Import `UpcomingDeadlines` component
- Add to homepage layout
- Position appropriately (sidebar or main area)

**Layout options:**
1. **Sidebar widget** - Compact, always visible
2. **Main section** - More prominent, can be collapsible
3. **Tab** - Share space with other content

**Checklist:**
- [ ] Import component
- [ ] Add to layout
- [ ] Position appropriately
- [ ] Test navigation
- [ ] Ensure responsive

---

### 3.3 Real-time Updates (Optional)

**Enhancement:** Update homepage when deadlines change

**Implementation:**
- Listen to socket events in UpcomingDeadlines
- Refetch or update local state
- Only if user is viewing homepage

**Checklist:**
- [ ] Add socket listeners
- [ ] Update state on events
- [ ] Test real-time updates

---

## Deliverables

- ✅ Upcoming deadlines component
- ✅ Integrated into homepage
- ✅ Navigation to groups works
- ✅ Proper grouping and display

---

## Notes

- Keep homepage component lightweight
- Consider pagination if many deadlines
- Group by urgency for better UX

