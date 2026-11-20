// Password input with a show/hide control. Same label, hint and error pattern as TextField.
import { useState, type ComponentProps } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { IconButton } from '@/components/ui/IconButton';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { TextField } from '@/components/ui/TextField';
import { useLanguage } from '@/hooks/use-language';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing' | 'below' | 'valid'> & {
  /** For a NEW password: show its strength while typing (replaces the hint once there is text). */
  strength?: boolean;
};

export function PasswordField({ id, strength = false, hint, ...field }: PasswordFieldProps) {
  const typed = typeof field.value === 'string' ? field.value : '';
  const showStrength = strength && typed.length > 0;
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      id={id}
      type={visible ? 'text' : 'password'}
      autoCapitalize="off"
      autoCorrect="off"
      spellCheck={false}
      hint={showStrength ? undefined : hint}
      below={showStrength ? <PasswordStrength id={`${id}-strength`} value={typed} /> : undefined}
      trailing={
        <IconButton
          icon={visible ? EyeOff : Eye}
          label={t(visible ? 'auth.password.hide' : 'auth.password.show')}
          aria-controls={id}
          aria-pressed={visible}
          onClick={() => setVisible((value) => !value)}
          className="mr-[0.15rem]"
        />
      }
      {...field}
    />
  );
}
