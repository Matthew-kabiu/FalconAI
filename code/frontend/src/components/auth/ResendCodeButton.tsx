// "Send a new code" with a cooldown, shared by every code step. `onResend` resolves
// to true when a new code was asked for, which restarts the countdown.
import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import { fill } from '@/components/auth/auth-text';
import { Button } from '@/components/ui/Button';
import { useAuthCooldown } from '@/hooks/use-auth-cooldown';
import { useLanguage } from '@/hooks/use-language';

interface ResendCodeButtonProps {
  onResend: () => Promise<boolean>;
  disabled?: boolean;
}

export function ResendCodeButton({ onResend, disabled = false }: ResendCodeButtonProps) {
  const { t } = useLanguage();
  const { remaining, restart } = useAuthCooldown();
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setSending(true);
    const sent = await onResend();
    setSending(false);
    if (sent) restart();
  };

  return (
    <Button variant="ghost" icon={RotateCw} loading={sending} disabled={disabled || remaining > 0} onClick={() => void resend()} className="w-full">
      <span className="tabular-nums">{remaining > 0 ? fill(t('auth.code.resendIn'), { seconds: remaining }) : t('auth.code.resend')}</span>
    </Button>
  );
}
