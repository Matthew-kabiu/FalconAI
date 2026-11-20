// On/off switch (custom-styled, never a browser checkbox). The state is shown by the
// thumb's position and by the word beside it, not by colour alone.
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Id of the element that names this switch. */
  labelledBy: string;
  /** Already-translated words for the two states. */
  onLabel: string;
  offLabel: string;
}

export function Switch({ checked, onChange, labelledBy, onLabel, offLabel }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      onClick={() => onChange(!checked)}
      className="group inline-flex min-h-[2.75rem] shrink-0 cursor-pointer items-center gap-[0.6em] rounded-[0.6rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <span className="w-[2ch] text-right text-[0.875rem] font-medium text-muted">{checked ? onLabel : offLabel}</span>
      <span
        className={`flex h-[1.6rem] w-[2.9rem] items-center rounded-full p-[0.2rem] transition-colors duration-200 ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span
          className={`size-[1.2rem] rounded-full transition-transform duration-200 ${checked ? 'translate-x-[1.3rem] bg-on-primary' : 'translate-x-0 bg-fg'}`}
        />
      </span>
    </button>
  );
}
