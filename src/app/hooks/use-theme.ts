import { useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light' | 'auto';

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    return (localStorage.getItem('theme') as ThemeMode | null) || 'auto';
  });

  useEffect(() => {
    applyTheme(theme);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (event: MediaQueryListEvent) => {
      if (localStorage.getItem('theme') === 'auto' || !localStorage.getItem('theme')) {
        document.documentElement.setAttribute('data-theme', event.matches ? 'dark' : 'light');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const changeTheme = (nextTheme: ThemeMode) => {
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    applyTheme(nextTheme);
  };

  return { theme, changeTheme };
}

function applyTheme(theme: ThemeMode) {
  const resolved = theme === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}
