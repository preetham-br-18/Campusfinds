import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Palette = 'indigo';

export interface PaletteOption {
  id: Palette;
  name: string;
  subtitle: string;
  primaryColor: string;
  accentColor: string;
  gradient: string;
  dotColor: string;
}

// Single best theme: Cyber Indigo (Collegiate Tech Blue with Cyan Accent)
export const BEST_PALETTE: PaletteOption = {
  id: 'indigo',
  name: 'Campus Blue & Cyan',
  subtitle: 'High-contrast collegiate tech accent',
  primaryColor: '#2563eb',
  accentColor: '#06b6d4',
  gradient: 'from-blue-600 to-cyan-500',
  dotColor: 'bg-blue-600',
};

export const PALETTES: PaletteOption[] = [BEST_PALETTE];

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  palette: Palette;
  setPalette: (palette: Palette) => void;
  palettes: PaletteOption[];
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('campusfind_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  const palette: Palette = 'indigo';

  useEffect(() => {
    try {
      localStorage.setItem('campusfind_theme', theme);
    } catch (e) {
      // quiet fallback
    }
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Lock document palette to best theme
    root.setAttribute('data-palette', 'indigo');
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setPalette = () => {
    // Locked to best theme
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        palette,
        setPalette,
        palettes: PALETTES,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

