import type { ComponentType, ReactNode } from 'react';

interface StateScreenProps {
  Art: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  /** Buttons: the way forward first (filled), the alternative second (outlined). */
  actions: ReactNode;
}

/** Shared layout for whole-screen states (not found, error): drawing, words, actions. */
export function StateScreen({ Art, title, body, actions }: StateScreenProps) {
  return (
    <section className="flex w-full max-w-[34rem] flex-col items-center text-center">
      <div className="w-[min(100%,18rem)] rounded-[1.25rem] bg-leaf-soft p-[clamp(1rem,4vw,1.75rem)]">
        <Art className="h-auto w-full" />
      </div>
      <h1 className="mt-[1.75rem] text-[clamp(1.625rem,1.3rem+1.6vw,2.25rem)] font-semibold leading-[1.15] tracking-tight text-balance">
        {title}
      </h1>
      <p className="mt-[0.6em] max-w-[28rem] leading-relaxed text-muted">{body}</p>
      <div className="mt-[1.75rem] flex w-full flex-col justify-center gap-[0.75rem] sm:w-auto sm:flex-row">{actions}</div>
    </section>
  );
}
