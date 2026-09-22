import React, { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';
export type Palette = 'indigo' | 'emerald' | 'violet';

export interface PaletteOption {
  id: Palette;
  name: string;
  subtitle: string;
  primaryColor: string;
  accentColor: string;
  gradient: string;
  dotColor: string;
}

export const PALETTES: PaletteOption[] = [
  {
    id: 'indigo',
    name: 'Cyber Indigo',
    subtitle: 'Electric tech campus & high contrast',
    primaryColor: '#2563eb',
    accentColor: '#06b6d4',
    gradient: 'from-blue-600 to-cyan-500',
    dotColor: 'bg-blue-600',
  },
  {
    id: 'emerald',
    name: 'Emerald Quad',
    subtitle: 'University park & safety recovery',
    primaryColor: '#059669',
    accentColor: '#10b981',
    gradient: 'from-emerald-600 to-teal-500',
    dotColor: 'bg-emerald-600',
  },
  {
    id: 'violet',
    name: 'Royal Amethyst',
    subtitle: 'Twilight velvet & creative distinction',
    primaryColor: '#7c3aed',
    accentColor: '#ec4899',
    gradient: 'from-violet-600 to-pink-500',
    dotColor: 'bg-violet-600',
  },
];

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

  const [palette, setPaletteState] = useState<Palette>(() => {
    try {
      const saved = localStorage.getItem('campusfind_palette') as Palette;
      if (PALETTES.some(p => p.id === saved)) return saved;
      return 'indigo';
    } catch (e) {
      return 'indigo';
    }
  });

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
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('campusfind_palette', palette);
    } catch (e) {
      // quiet fallback
    }
    const root = document.documentElement;
    root.setAttribute('data-palette', palette);
  }, [palette]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const setPalette = (newPalette: Palette) => {
    setPaletteState(newPalette);
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

