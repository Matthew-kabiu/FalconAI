// Label and icon for each theme choice, shared by the compact toggle and the labelled group.
import { Monitor, Moon, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { MessageKey } from '@/lib/i18n';
import type { Theme } from '@/lib/theme';

export const THEME_OPTIONS: Record<Theme, { label: MessageKey; Icon: LucideIcon }> = {
  system: { label: 'theme.system', Icon: Monitor },
  light: { label: 'theme.light', Icon: Sun },
  dark: { label: 'theme.dark', Icon: Moon },
};
