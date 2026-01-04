# Phase 2: File Upload & Media

**Status:** ✅ Mostly Complete (85%)
**Priority:** 🔴 Critical
**Estimated:** 3-4 days
**Completed:** December 2, 2025

---

## 📋 Overview

Enable file upload, preview, progress tracking, and display in messages.

---

## 🎯 Requirements

### 2.1 File Picker & Selection
**Current:** ✅ Implemented
**Status:** Complete

**Tasks:**
- [x] Add hidden file input.
- [x] Click paperclip → open file picker.
- [x] Support multiple file selection.
- [x] Accept: images, videos, documents (PDF, DOC, etc.).
- [x] **[LIMITATION] File size limit: 5MB (MUST enforce this client-side and backend).**
- [x] **[UX] Implement Drag and Drop support** for files into the chat input area.

**Files:**
- `components/chat/chat-panel.tsx` (for input integration)

### 2.2 File Preview Before Send
**Current:** ✅ Implemented
**Status:** Complete

**Tasks:**
- [x] Show thumbnail for images/videos.
- [x] Show file icon + name for documents.
- [x] Show file size.
- [x] Remove button (X) for each file.
- [x] Preview area above input.
- [x] **[FILES] Create `FileTypeIcon.tsx`** component for consistent icon display across preview and message bubbles.

**Files:**
- `components/chat/file-preview.tsx` ✅ (new)
- `components/chat/file-type-icon.tsx` ✅ (new)
- `components/chat/chat-panel.tsx` ✅

### 2.3 Upload Progress & Resilience
**Current:** 🔄 Partially Implemented
**Status:** Basic progress shown, needs cancel & retry enhancement

**Tasks:**
- [x] Show progress bar and percentage during upload.
- [ ] Cancel upload button. (TODO)
- [x] **[UX] On send, immediately show a *placeholder message* (Optimistic UI) with 'Uploading...' status.**
- [x] **[RESILIENCE] Handle upload errors** by displaying an **error icon (❌)** on the placeholder message and offering a **"Retry"** button.
- [ ] **[PERF] Evaluate and implement chunked upload** logic if backend supports it, even for the 5MB limit, for better network stability. (TODO - optional)

**Files:**
- `components/file-upload/file-upload-progress.tsx` (enhance)
- `components/chat/chat-panel.tsx` ✅

### 2.4 File Display in Messages
**Current:** ✅ Implemented
**Status:** Complete

**Tasks:**
- [x] Image: Show inline with click to expand.
- [x] Video: Show thumbnail with play button.
- [x] Document: Show icon + filename + download button.
- [x] Audio: Show audio player.
- [x] Multiple files: Grid layout.
- [x] **[UPDATE] Replace placeholder message** with the official message (✓) upon successful API response.

**Files:**
- `components/chat/file-message.tsx` ✅ (new)
- `components/chat/chat-panel.tsx` ✅

### 2.5 File Preview Modal
**Current:** ✅ Implemented
**Status:** Complete

**Tasks:**
- [x] Click image → open full-size preview.
- [x] Click video → open video player.
- [x] Navigation for multiple files.
- [x] Download button.

**Files:**
- `components/modals/file-preview-modal.tsx` ✅

---

## 🏗 Architecture

```
File Upload Flow:


+-------------------+-------------------------------------+-----------------+
|     FRONTEND (UI)     |           BACKEND (API)         |    EXTERNAL (DB/Storage)    |
+=======================+=================================+=================+
| 1. Select File (D&D)  |                                 |                 |
|   & Show Preview      |                                 |                 |
|                       |                                 |                 |
| 2. User Clicks SEND   |                                 |                 |
|   ──────────────────►| 3. POST /messages (Placeholder) |                 |
| (Optimistic Display   |  (Creates message record)       |                 |
|  of "Uploading..."    |                                 |                 |
|  Status)              | 4. Returns Placeholder ID       |                 |
|   ◄──────────────────|                                 |                 |
|                       |                                 |                 |
| 5. Start File Upload  |                                 |                 |
|   (Show Progress)     |                                 |                 |
|   ──────────────────►| 6. POST /files/upload           |                 |
|                       | (Receives file chunks)          | 7. Saves File to S3/GCS |
|                       |                                 | ◄───────────────|
| 8. Upload Complete    | 9. Returns File ID              |                 |
|   ◄──────────────────|                                 |                 |
|                       |                                 |                 |
| 10. File Upload OK    |                                 |                 |
|   ──────────────────►| 11. PUT /messages/:id (Finalize)|                 |
| (Replace Placeholder  |   (Updates message with File ID) |                 |
|  with Final Message)  |                                 |                 |
| 12. Update SUCCESS    | 13. Socket Emit (Optional)      |                 |
|   ◄──────────────────|                                 |                 |
+-------------------+-------------------------------------+-----------------+
```

---

## 📝 Implementation Steps

### Step 1: File Selection & Validation
1. Add hidden `<input type="file">` and trigger via paperclip.
2. Implement Drag and Drop logic (`onDrop`) for the chat area.
3. Handle `onChange` to get selected files.
4. **Validate file size (5MB limit) and type.**

### Step 2: Preview & Placeholder Component
1. Create `file-preview.tsx` and `FileTypeIcon.tsx`.
2. Show selected files and allow removal.
3. **On Send, create and display the Placeholder Message.**

### Step 3: Upload Integration & Resilience (CRITICAL)
1. **[FRONTEND]** On send, initiate file upload to `/files/upload`.
2. Show progress using existing component on the Placeholder Message.
3. **[BACKEND]** Ensure Backend validation (5MB, Mime-type) is robust.
4. **[FRONTEND]** Get file IDs from successful response.
5. **[FRONTEND]** If upload fails, mark Placeholder with ❌ and "Retry".

### Step 4: Message Display & Final Update
1. Create `file-message.tsx`.
2. After file IDs are received, call `/messages` API.
3. Upon successful `/messages` response, **replace the Placeholder Message with the final message.**
4. Detect file type and render appropriate UI (inline, player, icon/download).

### Step 5: Full Preview Modal
1. Enhance `FilePreviewModal` to support image zoom and video playback.
2. Implement download functionality.

---

## 🔌 API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/files/upload` | Upload file(s) |
| GET | `/files/:id` | Get file info |
| GET | `/files/:id/download` | Download file |
| POST | `/messages` | Send with file_info |

---

## 📁 File Types Support

| Category | Extensions | Preview Type |
|----------|------------|--------------|
| Image | jpg, png, gif, webp | Inline + Modal |
| Video | mp4, webm, mov | Thumbnail + Player |
| Audio | mp3, wav, ogg | Audio player |
| Document | pdf | Icon + Download |
| Document | doc, docx, xls, xlsx | Icon + Download |
| Archive | zip, rar, 7z | Icon + Download |
| Code | js, ts, py, etc | Icon + Download |

---

## ✅ Success Criteria

- [x] Click paperclip and **Drag & Drop** open file picker/add preview.
- [x] **File size is strictly limited to 5MB.**
- [x] **Placeholder message (Optimistic UI) is shown immediately upon send.**
- [x] Upload shows progress bar.
- [ ] Upload can be canceled. (TODO)
- [x] **Failed uploads show error (❌) and can be retried.**
- [x] Images display inline in messages, click opens full preview.
- [x] Documents show download button.
- [x] Multiple files supported and rendered correctly.
- [x] No build errors.

---

## 📝 Implementation Notes (December 2, 2025)

### Files Created:
1. `frontend/components/chat/file-type-icon.tsx` - Consistent file icons with category detection
2. `frontend/components/chat/file-preview.tsx` - Preview selected files before sending with validation
3. `frontend/components/chat/file-message.tsx` - Display files in message bubbles (image, video, audio, document)

### Files Modified:
1. `backend/routes/files.js` - Enhanced with 5MB limit, MIME validation, download endpoint
2. `frontend/lib/api-client.ts` - Added upload with progress tracking
3. `frontend/components/chat/chat-panel.tsx` - Full file upload integration with drag & drop

### Remaining Work:
- Cancel upload button
- Chunked upload for better network stability (optional)
