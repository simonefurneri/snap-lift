'use client';

import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ThemeToggleProps {
  className?: string;
  showLabels?: boolean | 'responsive';
}

export function ThemeToggle({ className, showLabels = 'responsive' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    if (showLabels === false) {
      return <div className="h-9 w-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
    }
    if (showLabels === true) {
      return <div className="h-10 w-full rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />;
    }
    return (
      <div className="h-9 w-9 md:w-56 rounded-xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
    );
  }

  const options = [
    { value: 'light', label: 'Chiaro', icon: Sun },
    { value: 'system', label: 'Auto', icon: Laptop },
    { value: 'dark', label: 'Scuro', icon: Moon },
  ];

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const CurrentIcon =
    theme === 'light'
      ? Sun
      : theme === 'dark'
      ? Moon
      : Laptop;

  // 1. Force full segmented control (e.g. sidebar, profile settings)
  if (showLabels === true) {
    return (
      <div
        className={cn(
          'grid grid-cols-3 p-1 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 gap-1 w-full box-border',
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'min-h-[32px] px-1.5 py-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
                isActive
                  ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
              title={`Tema ${opt.label}`}
              aria-label={`Imposta tema ${opt.label}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs leading-none">{opt.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 2. Force single icon cycle button (e.g. mobile header in AppLayout)
  if (showLabels === false) {
    return (
      <button
        type="button"
        onClick={cycleTheme}
        className={cn(
          'w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700 transition-colors cursor-pointer hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70',
          className
        )}
        title={`Tema attuale: ${theme || 'sistema'} (Clicca per cambiare)`}
        aria-label="Cambia tema"
      >
        <CurrentIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </button>
    );
  }

  // 3. Responsive mode ('responsive'):
  // - Mobile (< md / 768px): Single compact cycle button on the far right
  // - Desktop (>= md): Full 3-tab segmented control
  return (
    <div className="flex items-center">
      {/* Mobile view: Single compact cycle button */}
      <div className="md:hidden">
        <button
          type="button"
          onClick={cycleTheme}
          className={cn(
            'w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100/90 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700 transition-colors cursor-pointer hover:bg-zinc-200/70 dark:hover:bg-zinc-700/70',
            className
          )}
          title={`Tema attuale: ${theme || 'sistema'} (Clicca per cambiare)`}
          aria-label="Cambia tema"
        >
          <CurrentIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
        </button>
      </div>

      {/* Desktop view (md: and up): Full 3-tab segmented control */}
      <div
        className={cn(
          'hidden md:inline-flex items-center p-1 bg-zinc-100/90 dark:bg-zinc-800/80 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 gap-1 box-border',
          className
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const isActive = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                'min-h-[32px] px-3.5 py-1 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none whitespace-nowrap',
                isActive
                  ? 'bg-white dark:bg-zinc-700 text-zinc-950 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
              )}
              title={`Tema ${opt.label}`}
              aria-label={`Imposta tema ${opt.label}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs leading-none">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
