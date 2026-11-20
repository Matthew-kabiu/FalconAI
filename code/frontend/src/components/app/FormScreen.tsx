// Layout for every add/edit screen (the pattern later forms reuse).
// A back link, the title, then one card holding the fields and a full-width save
// button. On wide screens a picture sits beside the card to show what the form is
// for; on phones the form comes first and the picture is left out to keep it short.
import type { ComponentType, FormEvent, ReactNode } from 'react';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';

interface FormScreenProps {
  title: string;
  lead?: string;
  /** Drawing shown beside the form on wide screens. */
  Art?: ComponentType<{ className?: string }>;
  backTo: string;
  backLabel: string;
  onSubmit: () => void;
  submitLabel: string;
  submitIcon: LucideIcon;
  submitting: boolean;
  /** Already-translated problem that is not about one field. */
  formError?: string;
  children: ReactNode;
}

export function FormScreen({
  title,
  lead,
  Art,
  backTo,
  backLabel,
  onSubmit,
  submitLabel,
  submitIcon,
  submitting,
  formError,
  children,
}: FormScreenProps) {
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!submitting) onSubmit();
  };

  return (
    <div className="grid gap-[clamp(1rem,2.5vw,1.75rem)]">
      <Link
        to={backTo}
        className="inline-flex min-h-[2.75rem] w-fit items-center gap-[0.45em] rounded-[0.5rem] font-medium text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
        <ArrowLeft className="size-[1.15em]" aria-hidden="true" />
        {backLabel}
      </Link>

      <div className="grid items-start gap-[clamp(1.25rem,3vw,2.5rem)] lg:grid-cols-[minmax(0,36rem)_minmax(0,1fr)]">
        <section aria-labelledby="form-title" className="rounded-[1.25rem] bg-surface p-[clamp(1.25rem,3vw,2rem)]">
          <h1 id="form-title" className="text-[clamp(1.5rem,1.2rem+1.4vw,2rem)] font-semibold leading-[1.15] tracking-tight">
            {title}
          </h1>
          {lead && <p className="mt-[0.4em] text-muted">{lead}</p>}

          <form onSubmit={submit} noValidate className="mt-[1.75rem] flex flex-col gap-[1.25rem]">
            {formError && <FormError>{formError}</FormError>}
            {children}
            <Button type="submit" icon={submitIcon} loading={submitting} className="mt-[0.5rem] min-h-[3rem]! w-full">
              {submitLabel}
            </Button>
          </form>
        </section>

        {Art && (
          <div className="hidden items-center justify-center rounded-[1.25rem] bg-leaf-soft p-[clamp(1.5rem,4vw,3.5rem)] lg:flex lg:min-h-[24rem]">
            <Art className="h-auto w-[min(100%,22rem)]" />
          </div>
        )}
      </div>
    </div>
  );
}
