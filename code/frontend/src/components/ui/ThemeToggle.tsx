// Compact theme control for headers: one icon button showing the current choice.
// Each press moves to the next: System → Light → Dark → System. The labelled
// three-option version for settings is <ThemeRadioGroup/>.
import { IconButton } from '@/components/ui/IconButton';
import { THEME_OPTIONS } from '@/components/ui/theme-options';
import { useLanguage } from '@/hooks/use-language';
import { useTheme } from '@/hooks/use-theme';
import { THEMES } from '@/lib/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

  return (
    <IconButton
      icon={THEME_OPTIONS[theme].Icon}
      label={`${t('theme.label')}: ${t(THEME_OPTIONS[theme].label)}`}
      onClick={() => setTheme(next)}
      className={['hover:bg-transparent!', className].join(' ')}
    />
  );
}
