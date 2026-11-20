// The current theme choice and a setter. Every control that uses this stays in sync.
import { useSyncExternalStore } from 'react';
import { readTheme, setTheme, subscribeTheme } from '@/lib/theme';

export function useTheme() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme);
  return { theme, setTheme };
}
