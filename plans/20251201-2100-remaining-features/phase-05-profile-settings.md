# Phase 5: Profile & Settings

**Status:** ✅ Complete
**Priority:** 🟡 Medium
**Estimated:** 1-2 days
**Completed:** 2025-01-XX

---

## 📋 Overview

Complete profile editing with avatar upload and add user settings.

---

## 🎯 Requirements

### 5.1 Avatar Upload & Constraint
**Current:** Profile page has "Đổi ảnh đại diện" button, no functionality
**Missing:** Actual upload flow and image handling

**Tasks:**
- [x] Create specialized **`AvatarUploadDropzone.tsx`** component.
- [x] Click button triggers file picker (Accept images only).
- [x] Preview selected image (must be forced to **1:1 aspect ratio** in UI).
- [x] Upload file to `/files/upload` (reusing Phase 2 logic).
- [x] Update user profile with new `avatar_url`.
- [x] Show loading/success states.

**Files:**
- `app/profile/page.tsx`
- `components/profile/avatar-upload-dropzone.tsx` ✅ Created

### 5.2 Theme Toggle (Dark Mode)
**Current:** Backend has `preferences.theme`
**Missing:** UI toggle

**Tasks:**
- [x] Dark/Light/System mode toggle in settings.
- [x] Apply theme using Tailwind `dark:` variants.
- [x] **[PERF] Load preference early** (in Layout/ThemeProvider) to prevent **FOUC** (Flash of Unstyled Content).
- [x] Persist preference to backend via `PUT /users/preferences`.

**Files:**
- `app/settings/page.tsx` ✅ Updated with useTheme hook
- `app/layout.tsx` ✅ Added ThemeProvider + inline FOUC prevention script
- `contexts/ThemeContext.tsx` ✅ Created

### 5.3 Font Size Settings
**Current:** Backend has `preferences.font_size`
**Missing:** UI selector

**Tasks:**
- [x] Font size selector: Small, Medium, Large.
- [x] Apply to chat messages (via CSS variables or classes).
- [x] Persist preference to backend.
- [x] Preview changes in settings modal/page.

**Files:**
- `app/settings/page.tsx` ✅ Updated
- `app/globals.css` ✅ Added font size classes/variables

### 5.4 Notification & Privacy Preferences (Advanced)
**Current:** Backend may need enhancement
**Missing:** UI settings

**Tasks:**
- [x] **Toggle "Do Not Disturb" (DND):** Mute all notifications except direct mentions/tags.
- [x] Toggle general Sound on/off.
- [x] Request and manage Desktop notifications permission.
- [x] Toggle for Email notifications (if applicable).
- [x] Privacy: Toggle **Show online status**.
- [x] Privacy: Toggle **Read receipts** (if applicable).
- [x] Save all preferences via `PUT /users/preferences`.

**Files:**
- `app/settings/page.tsx` ✅ Updated with full notification/privacy tabs

---

## 🏗 Architecture

```
Profile Page:
┌─────────────────────────────────────────────────────────┐
│ Profile                                                 │
├─────────────────────────────────────────────────────────┤
│     ┌─────────────┐                                     │
│     │   Avatar    │  [Đổi ảnh đại diện]                │
│     │    (150)    │  → Opens file picker               │
│     └─────────────┘  → Shows preview                   │
│                      → Upload & save                    │
│                                                         │
│ Username: [________________]                            │
│ Bio:      [________________]                            │
│ Email:    user@email.com (read-only)                   │
│ MSSV:     12345678 (read-only)                         │
│                                                         │
│                              [Lưu thay đổi]            │
└─────────────────────────────────────────────────────────┘

Settings Page:
┌─────────────────────────────────────────────────────────┐
│ Settings                                                │
├─────────────────────────────────────────────────────────┤
│ Appearance                                              │
│ ├─ Theme:     [Light ▼] / [○ Light ● Dark ○ System]   │
│ └─ Font Size: [○ Small ● Medium ○ Large]              │
│                                                         │
│ Notifications                                           │
│ ├─ Desktop notifications: [ON/OFF]                     │
│ ├─ Sound: [ON/OFF]                                     │
│ └─ Email notifications: [ON/OFF]                       │
│                                                         │
│ Privacy                                                 │
│ ├─ Show online status: [ON/OFF]                        │
│ └─ Read receipts: [ON/OFF]                             │
└─────────────────────────────────────────────────────────┘
```

---

## 📝 Implementation Steps

### Step 1: Avatar Upload Component

1.  Create specialized **`AvatarUploadDropzone.tsx`** for profile photo handling.
2.  Implement file selection, validation (images only), and **1:1 aspect ratio constraint** on the preview UI.
3.  Implement the upload logic: call `POST /files/upload`, retrieve URL, and show loading state.
4.  Implement profile update: call `PUT /users/profile` with the new `avatar_url`.

### Step 2: Appearance (Theme & Font Size)

1.  Integrate **ThemeProvider** (e.g., `next-themes`) and ensure **[PERF] early preference loading** from Backend/Storage.
2.  Create UI toggles for Theme and Font Size in the settings page.
3.  Implement logic to apply theme classes (`dark:`) and font size CSS variables/classes globally.
4.  Implement saving these preferences to Backend (`PUT /users/preferences`).

### Step 3: Notifications & Privacy Logic

1.  Implement UI toggles for Sound, Desktop Notifications, DND, Online Status, and Read Receipts.
2.  Implement the browser request for Desktop notification permission.
3.  Implement the **DND logic** in the Frontend notification handler (suppress notifications unless it's a direct mention, if DND is ON).
4.  Implement saving all preference settings to Backend.

---

## 🔌 API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/files/upload` | Upload avatar |
| PUT | `/users/profile` | Update profile (username, bio, avatar_url) |
| PUT | `/users/preferences` | Update preferences (theme, font_size, notifications, privacy) |
| GET | `/auth/me` | Get current user data and preferences (for early loading) |

---

## 🎨 Theme Variables

```css
/* Light Mode */
--background: #ffffff
--foreground: #0a0a0a
--primary: #615ef0
--muted: #f3f3f3

/* Dark Mode */
--background: #0a0a0a
--foreground: #fafafa
--primary: #818cf8
--muted: #27272a
```

---

## ✅ Success Criteria

- [x] Can upload and change avatar using the specialized component.
- [x] Avatar preview enforces **1:1 aspect ratio**.
- [x] **Dark mode toggle works**, and theme persists across sessions with **no FOUC**.
- [x] Font size selector changes apply correctly to chat messages.
- [x] **Notification settings are granular:** DND toggle functions correctly to suppress general notifications.
- [x] All user preferences are correctly saved to and loaded from the backend.
- [x] No build errors.
