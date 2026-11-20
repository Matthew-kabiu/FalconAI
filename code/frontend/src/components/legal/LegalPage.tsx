// Renders a legal document: title, date, draft notice, a table of contents that stays
// in view on wide screens, and the sections. Text comes from the dictionary.
import { FileClock } from 'lucide-react';
import { Callout } from '@/components/marketing/Callout';
import { FOCUS, H2, LEAD, SECTION, WRAP } from '@/components/marketing/layout';
import type { LegalDocument } from '@/components/legal/documents';
import { useLanguage } from '@/hooks/use-language';

export function LegalPage({ document }: { document: LegalDocument }) {
  const { t } = useLanguage();

  return (
    <>
      <section className="bg-surface">
        <div className={`${WRAP} py-[clamp(2rem,7vh,4.5rem)]`}>
          <p className="text-[0.9375rem] font-semibold text-primary">
            {t('legal.updated')}: {t('legal.updatedDate')}
          </p>
          <h1 className="mt-[0.4em] text-[clamp(1.875rem,1.3rem+2.6vw,3rem)] font-semibold leading-[1.1] tracking-tight text-balance">
            {t(document.title)}
          </h1>
          <p className={`mt-[0.8em] max-w-[44rem] text-[1.125rem] ${LEAD}`}>{t(document.intro)}</p>
          <Callout icon={FileClock} title={t('legal.draft.title')} className="mt-[1.5rem] max-w-[44rem]">
            {t('legal.draft.body')}
          </Callout>
        </div>
      </section>

      <div className={`${WRAP} ${SECTION} grid gap-[clamp(2rem,5vw,5rem)] lg:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]`}>
        <nav aria-labelledby="legal-contents" className="lg:sticky lg:top-[6.5rem] lg:self-start">
          <h2 id="legal-contents" className="text-[0.9375rem] font-semibold text-muted">
            {t('legal.contents')}
          </h2>
          <ol className="mt-[0.5rem] list-none p-0">
            {document.sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className={`inline-flex min-h-[2.5rem] items-center rounded-[0.25rem] text-muted underline decoration-transparent underline-offset-[0.25em] transition-colors hover:text-fg hover:decoration-current ${FOCUS}`}
                >
                  {t(section.title)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid max-w-[46rem] gap-[clamp(2rem,5vh,3rem)]">
          {document.sections.map((section) => (
            <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`}>
              <h2 id={`${section.id}-title`} className={H2}>
                {t(section.title)}
              </h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mt-[1em] leading-relaxed">
                  {t(paragraph)}
                </p>
              ))}
              {section.bullets.length > 0 && (
                <ul className="mt-[1em] grid list-none gap-[0.7rem] p-0">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="grid grid-cols-[0.5rem_1fr] gap-[0.9rem] leading-relaxed">
                      <span className="mt-[0.65em] size-[0.5rem] rounded-full bg-primary" aria-hidden="true" />
                      {t(bullet)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
