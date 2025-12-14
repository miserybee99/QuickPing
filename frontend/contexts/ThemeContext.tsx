'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'quickping-theme';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
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
    
    // Set default font size to 16px
    root.style.setProperty('--base-font-size', '16px');
  }, []);

  // Initialize on mount
  useEffect(() => {
    // Load from localStorage first (for no FOUC)
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;

    const initialTheme = savedTheme || 'light';

    setThemeState(initialTheme);

    const resolved = resolveTheme(initialTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);

    setMounted(true);
  }, [resolveTheme, applyTheme]);

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

  // Don't return null - it breaks SSR/prerendering
  // The initial theme is applied via the script in layout
  // We still render children but with default values until mounted

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        setTheme,
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
