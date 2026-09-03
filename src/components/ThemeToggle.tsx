'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  variant?: 'icon' | 'pill';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-slate-200 bg-white/50 animate-pulse ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === 'dark' || theme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center p-1 rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900 ${className}`}
        role="group"
        aria-label="Day and Night mode selector"
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            !isDark
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Switch to Day Mode"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>Day</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
            isDark
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          title="Switch to Night Mode"
        >
          <Moon className="w-3.5 h-3.5 text-blue-200" />
          <span>Night</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Day mode' : 'Switch to Night mode'}
      title={isDark ? 'Switch to Day mode' : 'Switch to Night mode'}
      className={`relative w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all shadow-sm active:scale-95 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 transition-transform duration-200 rotate-0 scale-100" />
      )}
    </button>
  );
}
