// Password health, shown under a new-password field while the person types: a
// four-step bar, the level in words, and one tip. Words carry the meaning; colour and
// the bar only reinforce it. Announced politely to screen readers.
import { useLanguage } from '@/hooks/use-language';
import { passwordStrength } from '@/lib/password-strength';

const STEPS = [1, 2, 3, 4] as const;

export function PasswordStrength({ value, id }: { value: string; id: string }) {
  const { t } = useLanguage();
  if (!value) return null;

  const { level, label, tip } = passwordStrength(value);
  const weak = level <= 1;
  const fill = weak ? 'bg-danger' : level === 2 ? 'bg-muted' : 'bg-primary';

  return (
    <div id={id} aria-live="polite" className="mt-[0.6rem]">
      <div className="flex gap-[0.3rem]" aria-hidden="true">
        {STEPS.map((step) => (
          <span
            key={step}
            className={`h-[0.3rem] flex-1 rounded-full transition-colors duration-200 ${step <= level ? fill : 'bg-border'}`}
          />
        ))}
      </div>
      <p className="mt-[0.45rem] text-[0.875rem] leading-snug">
        <span className="text-muted">{t('auth.strength.label')}: </span>
        <span className={`font-semibold ${weak ? 'text-danger' : level >= 3 ? 'text-primary' : 'text-fg'}`}>{t(label)}</span>
        <span className="text-muted">. {t(tip)}</span>
      </p>
    </div>
  );
}
