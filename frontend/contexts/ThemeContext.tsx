'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type FontSize = 'small' | 'medium' | 'large';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  fontSize: FontSize;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'quickping-theme';
const FONT_SIZE_KEY = 'quickping-font-size';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Resolve the actual theme based on setting
  const resolveTheme = useCallback((themeSetting: Theme): 'light' | 'dark' => {
    if (themeSetting === 'system') {
      return getSystemTheme();
    }
    return themeSetting;
  }, [getSystemTheme]);

  // Apply theme to DOM
  const applyTheme = useCallback((resolved: 'light' | 'dark') => {
    const root = document.documentElement;
    
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Set color-scheme for native elements
    root.style.colorScheme = resolved;
  }, []);

  // Apply font size to DOM
  const applyFontSize = useCallback((size: FontSize) => {
    const root = document.documentElement;
    
    // Remove existing font size classes
    root.classList.remove('font-small', 'font-medium', 'font-large');
    root.classList.add(`font-${size}`);
    
    // Also set CSS variable for more granular control
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    root.style.setProperty('--base-font-size', fontSizeMap[size]);
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Load from localStorage first (for no FOUC)
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;

    const initialTheme = savedTheme || 'system';
    const initialFontSize = savedFontSize || 'medium';

    setThemeState(initialTheme);
    setFontSizeState(initialFontSize);

    const resolved = resolveTheme(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    applyFontSize(initialFontSize);

    setMounted(true);
  }, [resolveTheme, applyTheme, applyFontSize]);

  // Listen for system theme changes
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (theme === 'system') {
        const resolved = getSystemTheme();
        setResolvedTheme(resolved);
        applyTheme(resolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [mounted, theme, getSystemTheme, applyTheme]);

  // Set theme
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, [resolveTheme, applyTheme]);

  // Set font size
  const setFontSize = useCallback((newSize: FontSize) => {
    setFontSizeState(newSize);
    localStorage.setItem(FONT_SIZE_KEY, newSize);
    applyFontSize(newSize);
  }, [applyFontSize]);

  // Don't return null - it breaks SSR/prerendering
  // The initial theme is applied via the script in layout
  // We still render children but with default values until mounted

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        fontSize,
        setTheme,
        setFontSize,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
