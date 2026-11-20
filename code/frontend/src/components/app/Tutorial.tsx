// A short picture tutorial: one drawing, one title, one line per step. Used for the
// welcome tour and for "how to" guides on each activity (see lib/tutorials.ts).
// A native modal dialog, so focus stays inside; Escape, the X, Skip and the last
// step's button all close it.
import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { useLanguage } from '@/hooks/use-language';
import type { TutorialStep } from '@/lib/tutorials';

interface TutorialProps {
  steps: readonly TutorialStep[];
  open: boolean;
  onClose: () => void;
}

export function Tutorial({ steps, open, onClose }: TutorialProps) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [open]);

  if (!open) return null;

  const { title, body, Art } = steps[index];
  const last = index === steps.length - 1;
  const close = () => {
    setIndex(0);
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="tutorial-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,92vw)] overflow-y-auto rounded-[1.25rem] bg-surface p-[clamp(1rem,3vw,1.75rem)] text-fg shadow-[0_1rem_4rem_rgb(0_0_0/0.4)] backdrop:bg-[rgb(0_0_0/0.6)] backdrop:backdrop-blur-[0.15rem]"
    >
      <div className="relative flex items-center justify-center rounded-[1rem] bg-leaf-soft p-[clamp(1.25rem,5vw,2.5rem)]">
        <Art className="h-auto w-[min(100%,16rem)]" />
        <IconButton
          icon={X}
          label={t('common.close')}
          onClick={close}
          className="absolute right-[0.5rem] top-[0.5rem] rounded-full! bg-surface text-fg!"
        />
      </div>

      {/* Announced as the step changes. */}
      <div aria-live="polite" className="mt-[1.5rem] text-center">
        <h2 id="tutorial-title" className="text-[clamp(1.375rem,1.1rem+1.2vw,1.75rem)] font-semibold leading-[1.2] tracking-tight text-balance">
          {t(title)}
        </h2>
        <p className="mx-auto mt-[0.5rem] max-w-[24rem] text-[1.0625rem] leading-relaxed text-muted">{t(body)}</p>
      </div>

      <p className="mt-[1.25rem] flex items-center justify-center gap-[0.4rem]">
        <span className="sr-only">
          {index + 1} / {steps.length}
        </span>
        {steps.map((step, position) => (
          <span
            key={step.title}
            aria-hidden="true"
            className={`h-[0.5rem] rounded-full transition-all duration-200 ${position === index ? 'w-[2rem] bg-primary' : 'w-[0.5rem] bg-border'}`}
          />
        ))}
      </p>

      <div className="mt-[1.5rem] grid grid-cols-2 gap-[0.75rem]">
        {index === 0 ? (
          <Button icon={Check} variant="ghost" className="min-h-[3rem]" onClick={close}>
            {t('app.tour.skip')}
          </Button>
        ) : (
          <Button icon={ArrowLeft} variant="secondary" className="min-h-[3rem]" onClick={() => setIndex(index - 1)}>
            {t('app.tour.back')}
          </Button>
        )}
        {last ? (
          <Button icon={Check} iconPosition="right" className="min-h-[3rem]" onClick={close}>
            {t('app.tour.done')}
          </Button>
        ) : (
          <Button icon={ArrowRight} iconPosition="right" className="min-h-[3rem]" onClick={() => setIndex(index + 1)}>
            {t('app.tour.next')}
          </Button>
        )}
      </div>
    </dialog>
  );
}
