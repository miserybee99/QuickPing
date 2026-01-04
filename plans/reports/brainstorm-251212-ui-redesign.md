# 🎨 Brainstorm Report: QuickPing UI Redesign

**Date:** 2024-12-12  
**Style:** Slack-like  
**Scope:** Major Redesign - All Pages  
**Theme:** Light (default) + Dark mode support  

---

## 📋 Problem Statement

Current QuickPing UI has:
- Inconsistent icons across pages
- Mixed layout patterns
- Hardcoded colors instead of CSS variables
- No unified design system
- Different header styles per page

**Goal:** Create a cohesive, modern, Slack-inspired UI that feels professional and intuitive.

---

## 🎨 Design System Specification

### Color Palette

```css
/* Primary - Keep #615EF0 */
--primary: #615EF0;
--primary-hover: #5248d9;
--primary-light: #e8e7fd;

/* Neutrals - Slack-inspired */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;

/* Semantic Colors */
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;

/* Backgrounds */
--bg-primary: #ffffff;
--bg-secondary: #f9fafb;
--bg-sidebar: #3f0e40;  /* Slack-style dark sidebar option */
--bg-hover: #f3f4f6;

/* Dark Mode */
--dark-bg-primary: #1a1d21;
--dark-bg-secondary: #222529;
--dark-bg-sidebar: #19171d;
```

### Typography

```css
/* Font Family */
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Font Sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */

/* Font Weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

### Spacing System

```css
/* Base: 4px */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### Border Radius

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-xl: 12px;
--radius-full: 9999px;
```

---

## 🧭 Navigation & Icon Mapping

### Sidebar Icons (Lucide)

| Page | Current Icon | New Icon | Reason |
|------|--------------|----------|--------|
| Chat | `MessageSquare` | `MessageSquare` | ✅ Keep |
| Groups | `Users` | `Users` | ✅ Keep |
| Friends | `UserCheck` | `UserPlus` | Better represents adding/managing friends |
| Search | `Search` | `Search` | ✅ Keep |
| Profile | `Calendar` ❌ | `User` | Fix: Calendar is wrong |
| Settings | `Settings` | `Settings` | ✅ Keep |
| Notifications | (missing) | `Bell` | Add to sidebar |
| Files | (missing) | `FolderOpen` | Add to sidebar |

### New Sidebar Structure

```
┌─────────────────────┐
│     [Q] Logo        │  ← Keep purple bg
├─────────────────────┤
│  💬 Chat            │  ← MessageSquare
│  👥 Groups          │  ← Users  
│  👤 Friends         │  ← UserPlus
│  🔔 Notifications   │  ← Bell (NEW)
│  🔍 Search          │  ← Search
│  📁 Files           │  ← FolderOpen (NEW)
├─────────────────────┤
│  (spacer)           │
├─────────────────────┤
│  👤 Profile         │  ← User (FIXED)
│  ⚙️ Settings        │  ← Settings
└─────────────────────┘
```

---

## 📐 Layout Patterns

### 1. Standard Page Layout

```
┌──────────────────────────────────────────────────────┐
│ HEADER                                               │
│ ┌──────────────────────────────────────────────────┐ │
│ │ [←] Title                              [Actions] │ │
│ │     Subtitle/Description                         │ │
│ └──────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────┤
│ CONTENT                                              │
│ ┌──────────────────────────────────────────────────┐ │
│ │                                                  │ │
│ │  Main Content Area                               │ │
│ │  (Cards, Lists, Forms, etc.)                     │ │
│ │                                                  │ │
│ └──────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### 2. Chat Page Layout (3-Panel)

```
┌─────────┬──────────────────────┬─────────────┐
│ Conv    │     Messages         │  Details    │
│ List    │                      │  Panel      │
│         │                      │  (optional) │
│ 280px   │     flex-1           │  320px      │
└─────────┴──────────────────────┴─────────────┘
```

### 3. Standard Header Component

```tsx
<PageHeader
  icon={Icon}
  title="Page Title"
  subtitle="Description text"
  actions={<Button>Action</Button>}
  backButton={true|false}
/>
```

---

## 📄 Page-by-Page Specifications

### 1. Chat Page
- **Layout:** 3-panel (conversation list, messages, details)
- **Header:** Conversation name + avatar, action buttons
- **Style:** Clean message bubbles, subtle timestamps
- **Icons:** `MessageSquare`, `Phone`, `Video`, `MoreVertical`, `Paperclip`, `Smile`

### 2. Groups Page
- **Layout:** Grid of group cards
- **Header:** "Nhóm" + Create group button
- **Cards:** Group avatar, name, member count, last activity
- **Icons:** `Users`, `Plus`, `Settings`, `LogOut`

### 3. Friends Page
- **Layout:** Tabs (All, Pending, Blocked) + Friend list
- **Header:** "Bạn bè" + Add friend button
- **List items:** Avatar, name, status indicator, action buttons
- **Icons:** `UserPlus`, `UserMinus`, `UserX`, `MessageSquare`, `MoreHorizontal`

### 4. Profile Page
- **Layout:** Centered card with sections
- **Header:** "Hồ sơ cá nhân" + Save button
- **Sections:** Avatar, Info, Stats
- **Icons:** `User`, `Mail`, `Edit`, `Camera`, `Save`

### 5. Settings Page
- **Layout:** Sidebar tabs + Content area (Slack-style)
- **Tabs:** Appearance, Notifications, Privacy, Account
- **Icons:** `Palette`, `Bell`, `Shield`, `User`, `Moon`, `Sun`

### 6. Search Page
- **Layout:** Search bar + Results
- **Header:** Large search input
- **Results:** Tabbed (Users, Messages, Groups)
- **Icons:** `Search`, `User`, `MessageSquare`, `Users`

### 7. Notifications Page
- **Layout:** Chronological list
- **Header:** "Thông báo" + Mark all read
- **Items:** Icon, message, timestamp, action
- **Icons:** `Bell`, `MessageSquare`, `UserPlus`, `Users`, `AtSign`

### 8. Files Page
- **Layout:** Grid/List toggle
- **Header:** "Tệp tin" + Upload button
- **Items:** File icon, name, size, date, actions
- **Icons:** `File`, `Image`, `Video`, `FileText`, `Download`, `Trash2`

### 9. Login/Register Pages
- **Layout:** Centered card, clean form
- **Branding:** Logo prominent
- **Style:** Minimal, focused
- **Icons:** `Mail`, `Lock`, `Eye`, `EyeOff`, `User`

---

## 🔧 Implementation Plan

### Phase 1: Design Tokens (1 hour)
1. Update `globals.css` with new CSS variables
2. Update `tailwind.config.js` with design tokens
3. Create `design-tokens.ts` for JS access

### Phase 2: Core Components (2 hours)
1. Create `PageHeader` component
2. Update `Sidebar` with correct icons
3. Create `PageContainer` wrapper
4. Update Button, Card, Input variants

### Phase 3: Page Updates (4-6 hours)
1. Chat page refinements
2. Profile page redesign
3. Settings page Slack-style tabs
4. Groups page card layout
5. Friends page tabs + list
6. Search page
7. Notifications page
8. Files page
9. Login/Register polish

### Phase 4: Polish (1-2 hours)
1. Animations/transitions
2. Dark mode adjustments
3. Responsive breakpoints
4. Accessibility audit

---

## ✅ Success Criteria

- [ ] All pages use consistent `PageHeader` component
- [ ] Sidebar icons match page purpose
- [ ] Colors use CSS variables only (no hardcoded)
- [ ] Dark mode works on all pages
- [ ] Spacing follows 4px grid system
- [ ] Typography is consistent
- [ ] All icons from Lucide library
- [ ] Responsive on tablet/mobile

---

## ⚠️ Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing functionality | High | Test each page after update |
| Dark mode inconsistencies | Medium | Create dark mode checklist |
| Performance (too many re-renders) | Low | Use CSS variables, not JS |
| Time overrun | Medium | Prioritize visible pages first |

---

## 📋 Next Steps

1. **Approve this plan** - Confirm direction
2. **Run `/plan`** - Create detailed implementation plan with tasks
3. **Run `/code`** - Execute the implementation

---

## 📎 References

- [Slack Design System](https://slack.design/)
- [Lucide Icons](https://lucide.dev/icons/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)

