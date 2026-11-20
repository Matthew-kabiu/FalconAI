// Falcon AI's delete confirmation (DESIGN.md → Interaction contract → Destructive actions).
// A native modal dialog like Tutorial and CookieNotice: the browser dims the page, keeps
// focus inside and returns it to where it was when dialog.close() runs. Focus starts on
// Cancel. Escape and the X cancel, except while the action is pending. Failures show
// inside the dialog, because toasts render underneath an open modal.
import { useEffect, useId, useRef } from 'react';
import { Trash2, TriangleAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { FormError } from '@/components/ui/FormError';
import { IconButton } from '@/components/ui/IconButton';
import { useLanguage } from '@/hooks/use-language';

interface ConfirmDialogProps {
  open: boolean;
  /** Already-translated title naming the item, e.g. "Delete Shamba A?". */
  title: string;
  /** Already-translated text saying what will be lost. */
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** The action is running: Confirm shows a spinner and cancelling is paused. */
  pending?: boolean;
  /** Already-translated failure message, shown above the buttons. */
  error?: string;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
  error,
}: ConfirmDialogProps) {
  const { t } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const bodyId = `${id}-body`;

  // The dialog stays mounted and is opened and closed natively, so close() hands
  // focus back to the control that opened it.
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      element.showModal();
      element.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const cancel = () => {
    if (!pending) onCancel();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      // Some browsers close on a repeated Escape even when cancel is prevented; keep the
      // parent's state in step (or reopen while the action is still running).
      onClose={() => {
        if (!open) return;
        if (pending) dialog.current?.showModal();
        else onCancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(28rem,92vw)] overflow-y-auto rounded-[1.25rem] bg-surface p-[clamp(1.25rem,4vw,1.75rem)] text-fg shadow-[0_1rem_4rem_rgb(0_0_0/0.4)] backdrop:bg-[rgb(0_0_0/0.6)] backdrop:backdrop-blur-[0.15rem]"
    >
      <div className="flex items-start justify-between gap-[1rem]">
        <span className="inline-flex size-[3rem] shrink-0 items-center justify-center rounded-full bg-bg text-danger">
          <TriangleAlert className="size-[1.5em]" aria-hidden="true" />
        </span>
        <IconButton
          icon={X}
          label={t('common.close')}
          onClick={cancel}
          disabled={pending}
          className="-mr-[0.5rem] -mt-[0.25rem] shrink-0 rounded-full!"
        />
      </div>

      <h2 id={titleId} className="mt-[1rem] text-[1.375rem] font-semibold leading-[1.2] text-balance break-words">
        {title}
      </h2>
      <p id={bodyId} className="mt-[0.5rem] leading-relaxed text-muted break-words">
        {body}
      </p>

      {error && <FormError className="mt-[1.25rem]">{error}</FormError>}

      <div className="mt-[1.5rem] grid gap-[0.75rem] sm:grid-cols-2">
        <Button icon={X} variant="secondary" onClick={cancel} disabled={pending} data-initial-focus="" className="min-h-[3rem]">
          {cancelLabel}
        </Button>
        <Button icon={Trash2} variant="danger" onClick={onConfirm} loading={pending} className="min-h-[3rem]">
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
