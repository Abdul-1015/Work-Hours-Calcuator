import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils/cn';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored === 'dark' || (!stored && prefersDark);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    document.documentElement.classList.toggle('dark', newDark);
    localStorage.setItem('theme', newDark ? 'dark' : 'light');
  };

  if (!mounted) {
    return (
      <div className="w-10 h-10" />
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        "relative w-10 h-10 flex items-center justify-center rounded-xl",
        "bg-canvas-soft border border-ink/10 hover:border-ink/20",
        "transition-default cursor-pointer",
        "dark:bg-ink-deep dark:border-canvas-soft/10 dark:hover:border-canvas-soft/20"
      )}
    >
      {darkMode ? (
        <Sun className="w-4.5 h-4.5 text-primary" />
      ) : (
        <Moon className="w-4.5 h-4.5 text-ink" />
      )}
    </button>
  );
}
