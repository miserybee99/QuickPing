/**
 * QuickPing Design System Tokens
 * Slack-like UI with light/dark mode support
 * 
 * Usage:
 * import { colors, spacing, icons } from '@/lib/design-tokens';
 */

// ============================================
// COLORS
// ============================================

export const colors = {
  // Primary - QuickPing Purple
  primary: {
    DEFAULT: '#615EF0',
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#615EF0',
    600: '#5248d9',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Semantic Colors
  success: {
    DEFAULT: '#22c55e',
    light: '#f0fdf4',
    dark: '#16a34a',
  },
  warning: {
    DEFAULT: '#f59e0b',
    light: '#fffbeb',
    dark: '#d97706',
  },
  error: {
    DEFAULT: '#ef4444',
    light: '#fef2f2',
    dark: '#dc2626',
  },
  info: {
    DEFAULT: '#3b82f6',
    light: '#eff6ff',
    dark: '#2563eb',
  },
  
  // Gray Scale
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  
  // Status Colors
  status: {
    online: '#22c55e',
    offline: '#9ca3af',
    away: '#f59e0b',
    busy: '#ef4444',
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
} as const;

// ============================================
// LAYOUT
// ============================================

export const layout = {
  sidebarWidth: '72px',
  sidebarWidthExpanded: '240px',
  headerHeight: '64px',
  maxContentWidth: '1400px',
  chatPanelMinWidth: '320px',
  detailsPanelWidth: '320px',
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', Consolas, Monaco, 'Courier New', monospace",
  },
  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const borderRadius = {
  none: '0',
  sm: '0.25rem',    // 4px
  DEFAULT: '0.375rem', // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  full: '9999px',
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  sidebar: '4px 0 24px rgba(0, 0, 0, 0.08)',
  card: '0 2px 8px rgba(0, 0, 0, 0.08)',
  dropdown: '0 4px 16px rgba(0, 0, 0, 0.12)',
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  fast: '150ms ease',
  DEFAULT: '200ms ease',
  slow: '300ms ease',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  popover: 250,
  tooltip: 300,
  toast: 400,
} as const;

// ============================================
// ICON MAPPING
// ============================================

export const iconMap = {
  // Navigation Icons
  navigation: {
    chat: 'MessageSquare',
    groups: 'Users',
    friends: 'UserPlus',
    notifications: 'Bell',
    search: 'Search',
    files: 'FolderOpen',
    profile: 'User',
    settings: 'Settings',
  },
  
  // Action Icons
  actions: {
    add: 'Plus',
    edit: 'Pencil',
    delete: 'Trash2',
    save: 'Save',
    cancel: 'X',
    send: 'Send',
    upload: 'Upload',
    download: 'Download',
    copy: 'Copy',
    share: 'Share2',
    more: 'MoreHorizontal',
    moreVertical: 'MoreVertical',
  },
  
  // Status Icons
  status: {
    online: 'Circle',
    offline: 'CircleOff',
    away: 'Clock',
    busy: 'MinusCircle',
    check: 'Check',
    checkDouble: 'CheckCheck',
    warning: 'AlertTriangle',
    error: 'AlertCircle',
    info: 'Info',
  },
  
  // Media Icons
  media: {
    image: 'Image',
    video: 'Video',
    audio: 'Music',
    file: 'File',
    fileText: 'FileText',
    folder: 'Folder',
    folderOpen: 'FolderOpen',
    attachment: 'Paperclip',
  },
  
  // Communication Icons
  communication: {
    message: 'MessageSquare',
    reply: 'Reply',
    forward: 'Forward',
    phone: 'Phone',
    video: 'Video',
    call: 'PhoneCall',
    mic: 'Mic',
    micOff: 'MicOff',
  },
  
  // UI Icons
  ui: {
    chevronUp: 'ChevronUp',
    chevronDown: 'ChevronDown',
    chevronLeft: 'ChevronLeft',
    chevronRight: 'ChevronRight',
    arrowLeft: 'ArrowLeft',
    arrowRight: 'ArrowRight',
    close: 'X',
    menu: 'Menu',
    search: 'Search',
    filter: 'Filter',
    sort: 'ArrowUpDown',
    refresh: 'RefreshCw',
    loader: 'Loader2',
    sparkles: 'Sparkles',
  },
} as const;

// ============================================
// BREAKPOINTS
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// DEFAULT EXPORT
// ============================================

const designTokens = {
  colors,
  spacing,
  layout,
  typography,
  borderRadius,
  shadows,
  transitions,
  zIndex,
  iconMap,
  breakpoints,
};

export default designTokens;

