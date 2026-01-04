# 🚀 Plan: Implement Remaining Features

**Created:** 2024-12-01 21:00
**Status:** 🟢 In Progress
**Priority:** High

---

## 📊 Overview

Implement all remaining frontend UI features that already have backend API support.

### Progress Summary
| Phase | Name | Status | Priority |
|-------|------|--------|----------|
| 1 | [Core Messaging Enhancements](./phase-01-core-messaging.md) | 🟡 In Progress | 🔴 Critical |
| 2 | [File Upload & Media](./phase-02-file-upload.md) | ⬜ Not Started | 🔴 Critical |
| 3 | [Message Interactions](./phase-03-message-interactions.md) | ⬜ Not Started | 🟠 High |
| 4 | [Group Advanced Features](./phase-04-group-features.md) | ⬜ Not Started | 🟠 High |
| 5 | [Profile & Settings](./phase-05-profile-settings.md) | ⬜ Not Started | 🟡 Medium |
| 6 | [AI Features](./phase-06-ai-features.md) | ⬜ Not Started | 🟢 Low |

---

## 🎯 Features by Phase

### Phase 1: Core Messaging Enhancements (Critical) - 🟡 In Progress
- [x] Seen message UI (tích xanh/xám)
- [x] Last seen time display
- [x] Edit message UI + "(edited)" badge
- [x] Emoji picker in chat input
- [x] Message actions hover menu
- [x] Typing indicator (already done)

### Phase 2: File Upload & Media (Critical)
- [ ] File picker (click paperclip)
- [ ] File preview before send
- [ ] Upload progress bar
- [ ] File display in message bubble
- [ ] Image/video preview modal

### Phase 3: Message Interactions (High)
- [ ] Reaction emoji on messages
- [ ] Reply-to-message UI
- [ ] Thread view UI
- [ ] Pin/unpin message UI
- [ ] Pinned messages section

### Phase 4: Group Advanced Features (High)
- [ ] Group settings modal
- [ ] Role management (promote/demote)
- [ ] Vote creation UI
- [ ] Vote display in messages
- [ ] Vote results realtime

### Phase 5: Profile & Settings (Medium)
- [ ] Avatar upload (real)
- [ ] Theme toggle (dark mode)
- [ ] Font size settings
- [ ] Notification preferences

### Phase 6: AI Features (Low)
- [ ] AI Summarize button
- [ ] Summary display modal
- [ ] Integration with real AI API

---

## 📅 Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 1 | 2-3 days | None |
| Phase 2 | 3-4 days | Phase 1 |
| Phase 3 | 3-4 days | Phase 1, 2 |
| Phase 4 | 2-3 days | Phase 1 |
| Phase 5 | 1-2 days | Phase 2 (avatar upload) |
| Phase 6 | 2-3 days | All phases |

**Total Estimated:** 13-19 days

---

## 🛠 Technical Stack

- **Frontend:** Next.js 16, React, TypeScript, TailwindCSS
- **UI Components:** shadcn/ui, Lucide icons
- **Real-time:** Socket.io
- **Backend:** Node.js, Express, MongoDB (already complete)
- **File Storage:** Multer (local uploads/)

---

## 📁 Key Files to Modify

### Chat Components
- `components/chat/chat-panel.tsx` - Main chat UI
- `components/chat/messages-panel.tsx` - Conversation list
- `components/chat/directory-panel.tsx` - Group info panel

### New Components to Create
- `components/chat/message-actions.tsx` - Hover actions (reply, react, pin, edit)
- `components/chat/file-message.tsx` - File display in message
- `components/chat/reply-preview.tsx` - Reply-to preview
- `components/chat/thread-panel.tsx` - Thread view
- `components/chat/pinned-messages.tsx` - Pinned messages section
- `components/modals/vote-modal.tsx` - Create/view vote
- `components/modals/ai-summary-modal.tsx` - AI summary display

### Existing Components to Enhance
- `components/emoji/emoji-picker.tsx` - Already exists, integrate
- `components/reactions/reaction-viewer.tsx` - Already exists, integrate
- `components/file-upload/file-dropzone.tsx` - Already exists, integrate
- `components/file-upload/file-upload-progress.tsx` - Already exists, integrate

---

## ✅ Success Criteria

1. All features work with real backend API (no mocks)
2. Real-time updates via Socket.io
3. Responsive UI (mobile-friendly)
4. No TypeScript/build errors
5. Consistent with existing design system
