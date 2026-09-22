import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Palette as PaletteIcon, Check, Sparkles } from 'lucide-react';
import { useTheme, PALETTES, Palette } from '../../lib/themeContext';

export const ThemeSelector: React.FC = () => {
  const { theme, toggleTheme, setTheme, palette, setPalette, palettes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const activePalette = palettes.find(p => p.id === palette) || palettes[0];

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* 1-Click Fast Toggle (Sun / Moon) */}
      <button
        id="theme-quick-toggle-btn"
        onClick={toggleTheme}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
        ) : (
          <Moon className="w-4 h-4 text-slate-700 transition-transform duration-300 rotate-0 hover:-rotate-12" />
        )}
      </button>

      {/* Palette & Theme Customizer Button */}
      <button
        id="theme-palette-menu-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 active:scale-95 flex items-center space-x-1"
        title="Theme & Colors"
        aria-label="Open Theme Palette Menu"
      >
        <PaletteIcon className="w-4 h-4" />
        <span
          className="w-2 h-2 rounded-full ring-1 ring-white/50 dark:ring-black/50"
          style={{ backgroundColor: activePalette.primaryColor }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-84 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xl p-4 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-theme-main" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Theme & Appearance</h4>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {theme === 'dark' ? 'Dark' : 'Light'} • {activePalette.name}
            </span>
          </div>

          {/* Mode Switcher (Light / Dark) */}
          <div className="mt-3">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
              Color Mode
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
              <button
                id="theme-select-light-btn"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Sun className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-500' : ''}`} />
                <span>Light</span>
              </button>
              <button
                id="theme-select-dark-btn"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-white/10'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Moon className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-blue-400' : ''}`} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Attractive Campus Palettes */}
          <div className="mt-4">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 block">
              Campus Accent Theme
            </label>
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {palettes.map((item) => {
                const isSelected = item.id === palette;
                return (
                  <button
                    key={item.id}
                    id={`palette-btn-${item.id}`}
                    onClick={() => {
                      setPalette(item.id);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800/90 ring-1 ring-slate-300 dark:ring-slate-700'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      {/* Color dots preview */}
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        <span
                          className="w-5 h-5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                          style={{ backgroundColor: item.primaryColor }}
                        />
                        <span
                          className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-900"
                          style={{ backgroundColor: item.accentColor }}
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Info Footer */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
            <span>Theme auto-saved</span>
            <button
              onClick={() => {
                setTheme('dark');
                setPalette('indigo');
              }}
              className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors font-medium"
            >
              Reset default
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
