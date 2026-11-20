// One calendar for the whole farm (Matt, 2026-11-19). The big month grid is the star:
// every crop's stages and tasks, every logged activity and the farmer's own events,
// in Kenya time. The side panel holds the selected day, "Coming up" and "Done", plus
// what to show on the grid. Past days are greyed and cannot take new events; today
// is marked; today and later days are clickable (pointer) to see the day or add an event.
import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Clock, Info, RefreshCw } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { KenyaClock } from '@/components/app/KenyaClock';
import { PageHeader } from '@/components/app/PageHeader';
import { LoadingState } from '@/components/feedback/LoadingState';
import { Button } from '@/components/ui/Button';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import {
  addMonths,
  DAY_LABEL_FORMAT,
  formatIso,
  monthOf,
  monthWeeks,
  MONTH_HEADING_FORMAT,
  weekdayNames,
  DATE_LOCALES,
} from '@/components/ui/date-picker';
import { useFarmCalendar, useFarmCalendarRange } from '@/hooks/use-crops';
import { useLanguage } from '@/hooks/use-language';
import { ACTIVITY_LABELS, calendarLabel, cropIcon, cropName } from '@/lib/crops';
import {
  comingUp,
  dayTime,
  done,
  ENTRY_KINDS,
  entryKey,
  hasUnreviewed,
  onDay,
  startingOn,
  type EntryKind,
} from '@/lib/farm-calendar';
import { formatDay, formatKes } from '@/lib/format';
import { isMessageKey, type MessageKey } from '@/lib/i18n';
import { kenyaToday } from '@/lib/kenya-time';
import { ROUTES } from '@/lib/routes';
import type { ActivityKind, FarmCalendarEntry } from '@/types/crop';

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';
const CELL_LIMIT = 3;

/** One colour per kind, used on chips, list markers and the legend. */
const KIND_STYLE: Record<EntryKind, { chip: string; dot: string; label: MessageKey }> = {
  task: { chip: 'bg-leaf-soft text-fg', dot: 'bg-leaf', label: 'calendar.kind.task' },
  stage: { chip: 'bg-bg text-muted', dot: 'bg-muted', label: 'calendar.kind.stage' },
  activity: { chip: 'bg-success/15 text-fg', dot: 'bg-success', label: 'calendar.kind.activity' },
  event: { chip: 'bg-brand-accent/20 text-fg', dot: 'bg-brand-accent', label: 'calendar.kind.event' },
};

type Panel = 'day' | 'upcoming' | 'done';

function useEntryText() {
  const { language, t } = useLanguage();
  const what = (entry: FarmCalendarEntry) =>
    entry.kind === 'event'
      ? (entry.title ?? '')
      : entry.kind === 'activity'
        ? t(ACTIVITY_LABELS[entry.key as ActivityKind] ?? 'activity.other')
        : calendarLabel(entry.key, t, isMessageKey);
  const where = (entry: FarmCalendarEntry) =>
    entry.crop ? `${cropName({ crop: entry.crop, customCrop: entry.customCrop }, t)}${entry.plotName ? `, ${entry.plotName}` : ''}` : null;
  const when = (entry: FarmCalendarEntry) =>
    entry.startsOn === entry.endsOn
      ? `${formatDay(entry.startsOn, language)}${entry.time ? `, ${entry.time}` : ''}`
      : `${formatDay(entry.startsOn, language)} – ${formatDay(entry.endsOn, language)}`;
  return { what, where, when };
}

/** Where an item opens: own events to their edit screen, everything else to its crop. */
const entryLink = (entry: FarmCalendarEntry) =>
  entry.kind === 'event' && entry.eventId
    ? ROUTES.pages.app.eventEdit(entry.eventId)
    : entry.cycleId
      ? ROUTES.pages.app.crop(entry.cycleId)
      : ROUTES.pages.app.calendar;

/** A small chip inside a month-grid cell. */
function Chip({ entry }: { entry: FarmCalendarEntry }) {
  const { what } = useEntryText();
  return (
    <Link
      to={entryLink(entry)}
      onClick={(event) => event.stopPropagation()}
      className={`block truncate rounded-[0.4rem] px-[0.4em] py-[0.15em] text-[0.75rem] font-medium leading-snug transition-opacity hover:opacity-80 ${KIND_STYLE[entry.kind].chip} ${FOCUS}`}
    >
      {entry.kind === 'event' && entry.time && <span className="tabular-nums">{entry.time} </span>}
      {entry.kind === 'activity' && <CircleCheck className="mr-[0.2em] inline size-[0.9em] align-[-0.1em] text-success" aria-hidden="true" />}
      {what(entry)}
    </Link>
  );
}

/** One row in the side panel lists. */
function Row({ entry }: { entry: FarmCalendarEntry }) {
  const { language } = useLanguage();
  const { what, where, when } = useEntryText();
  const Icon = entry.crop ? cropIcon(entry.crop) : CalendarPlus;
  return (
    <li>
      <Link
        to={entryLink(entry)}
        className={`group flex items-center gap-[0.75rem] rounded-[0.85rem] p-[0.6rem] transition-colors hover:bg-surface-hover ${FOCUS}`}
      >
        <span className="relative flex size-[2.4rem] shrink-0 items-center justify-center rounded-[0.65rem] bg-bg">
          <Icon className="size-[1.2rem] text-primary" aria-hidden="true" />
          <span className={`absolute -right-[0.15rem] -top-[0.15rem] size-[0.6rem] rounded-full ${KIND_STYLE[entry.kind].dot}`} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{what(entry)}</span>
          <span className="block truncate text-[0.8125rem] text-muted">
            {[where(entry), when(entry)].filter(Boolean).join(' · ')}
          </span>
        </span>
        {entry.kind === 'activity' && entry.costKes !== null && (
          <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted">{formatKes(entry.costKes, language)}</span>
        )}
      </Link>
    </li>
  );
}

function RowList({ entries, empty }: { entries: readonly FarmCalendarEntry[]; empty: string }) {
  if (entries.length === 0) return <p className="px-[0.6rem] py-[0.5rem] text-[0.9375rem] text-muted">{empty}</p>;
  return (
    <ul className="grid list-none gap-[0.15rem] p-0">
      {entries.map((entry) => (
        <Row key={entryKey(entry)} entry={entry} />
      ))}
    </ul>
  );
}

export default function CalendarPage() {
  const { language, t } = useLanguage();
  const locale = DATE_LOCALES[language];
  const [params, setParams] = useSearchParams();
  const kenyaNow = kenyaToday();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? `${params.get('month')}-01` : `${monthOf(kenyaNow)}-01`;
  const [selected, setSelected] = useState(kenyaNow);
  const [panel, setPanel] = useState<Panel>('day');
  const [shown, setShown] = useState<Record<EntryKind, boolean>>({ task: true, stage: true, activity: true, event: true });

  const weeks = useMemo(() => monthWeeks(month), [month]);
  const grid = useFarmCalendarRange(weeks[0][0], weeks[5][6]);
  const lists = useFarmCalendar();
  const weekdays = useMemo(() => weekdayNames(locale), [locale]);

  // Live: when midnight passes in Kenya, reload so "today", past days and "Coming up" move on.
  const [day, setDay] = useState(kenyaNow);
  const { reload: reloadGrid } = grid;
  const { reload: reloadLists } = lists;
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = kenyaToday();
      if (current !== day) {
        setDay(current);
        reloadGrid();
        reloadLists();
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [day, reloadGrid, reloadLists]);

  const today = grid.state.kind === 'ok' ? grid.state.data.today : kenyaNow;
  const gridEntries = grid.state.kind === 'ok' ? grid.state.data.entries.filter((entry) => shown[entry.kind]) : [];
  const listToday = lists.state.kind === 'ok' ? lists.state.data.today : today;
  const listEntries = lists.state.kind === 'ok' ? lists.state.data.entries : [];
  const selectedTime = dayTime(selected, today);

  const goMonth = (offset: number) => setParams({ month: monthOf(addMonths(month, offset)) });
  const goToday = () => {
    setParams({});
    setSelected(today);
    setPanel('day');
  };
  const choose = (day: string) => {
    setSelected(day);
    setPanel('day');
  };

  return (
    <div className="grid gap-[clamp(1.25rem,3vw,2rem)]">
      <PageHeader
        title={t('calendar.title')}
        lead={t('calendar.lead')}
        actions={
          <ButtonLink to={ROUTES.pages.app.eventNew(selectedTime === 'past' ? today : selected)} icon={CalendarPlus}>
            {t('event.add')}
          </ButtonLink>
        }
      />

      <div className="grid items-start gap-[clamp(1rem,2.5vw,1.75rem)] xl:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)]">
        {/* ─── The big calendar ─── */}
        <section aria-labelledby="calendar-month" className="rounded-[1.25rem] bg-surface p-[clamp(0.75rem,2vw,1.5rem)]">
          <div className="flex flex-wrap items-center gap-[0.75rem]">
            <h2 id="calendar-month" className="mr-auto text-[clamp(1.25rem,1rem+1vw,1.75rem)] font-semibold capitalize tracking-tight" aria-live="polite">
              {formatIso(month, locale, MONTH_HEADING_FORMAT)}
            </h2>
            <KenyaClock label={t('calendar.timeZone')} />
            <div className="flex items-center gap-[0.25rem]">
              <Button variant="ghost" icon={ChevronLeft} aria-label={t('date.previousMonth')} className="min-h-[2.75rem] px-[0.6em]" onClick={() => goMonth(-1)} />
              <Button variant="secondary" icon={Clock} className="min-h-[2.75rem]" onClick={goToday}>
                {t('app.today')}
              </Button>
              <Button variant="ghost" icon={ChevronRight} aria-label={t('date.nextMonth')} className="min-h-[2.75rem] px-[0.6em]" onClick={() => goMonth(1)} />
            </div>
          </div>

          {grid.state.kind === 'loading' && <LoadingState />}
          {(grid.state.kind === 'error' || grid.state.kind === 'notFound') && (
            <div className="mt-[1rem] rounded-[1rem] bg-bg p-[1.25rem]" role="alert">
              <p className="flex items-start gap-[0.6em] text-danger">
                <CircleAlert className="mt-[0.15em] size-[1.25em] shrink-0" aria-hidden="true" />
                {t(grid.state.kind === 'error' ? grid.state.message : 'error.generic')}
              </p>
              <Button className="mt-[1rem]" icon={RefreshCw} onClick={grid.reload}>
                {t('common.tryAgain')}
              </Button>
            </div>
          )}

          {grid.state.kind === 'ok' && (
            <div role="grid" aria-labelledby="calendar-month" className="mt-[1rem] grid gap-[0.3rem]">
              <div role="row" className="grid grid-cols-7 gap-[0.3rem]">
                {weekdays.map((name) => (
                  <span key={name.long} role="columnheader" aria-label={name.long} className="px-[0.4rem] text-[0.75rem] font-semibold uppercase tracking-wide text-muted">
                    {name.short}
                  </span>
                ))}
              </div>
              {weeks.map((week) => (
                <div role="row" key={week[0]} className="grid grid-cols-7 gap-[0.3rem]">
                  {week.map((day) => {
                    const time = dayTime(day, today);
                    const inMonth = monthOf(day) === monthOf(month);
                    const items = startingOn(gridEntries, day);
                    const isSelected = day === selected;
                    const open = time !== 'past';
                    return (
                      <div
                        role="gridcell"
                        key={day}
                        aria-selected={isSelected}
                        onClick={open ? () => choose(day) : undefined}
                        className={[
                          'flex min-h-[clamp(3.25rem,9vw,7.5rem)] min-w-0 flex-col gap-[0.25rem] rounded-[0.75rem] p-[0.35rem] transition-colors',
                          time === 'past' && 'cursor-default bg-bg/40 text-muted',
                          time === 'today' && 'cursor-pointer bg-leaf-soft ring-2 ring-primary',
                          time === 'future' && 'cursor-pointer bg-bg hover:bg-surface-hover',
                          isSelected && time !== 'today' && 'ring-2 ring-focus',
                          !inMonth && 'opacity-50',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        {open ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              choose(day);
                            }}
                            aria-label={formatIso(day, locale, DAY_LABEL_FORMAT)}
                            aria-current={time === 'today' ? 'date' : undefined}
                            className={`flex size-[1.9rem] cursor-pointer items-center justify-center self-start rounded-full text-[0.875rem] font-semibold tabular-nums ${time === 'today' ? 'bg-primary text-on-primary' : 'hover:bg-surface'} ${FOCUS}`}
                          >
                            {Number(day.slice(8))}
                          </button>
                        ) : (
                          <span className="flex size-[1.9rem] items-center justify-center text-[0.875rem] tabular-nums line-through decoration-muted/40">
                            <span className="sr-only">{formatIso(day, locale, DAY_LABEL_FORMAT)}</span>
                            <span aria-hidden="true">{Number(day.slice(8))}</span>
                          </span>
                        )}
                        {/* Chips on wider screens; coloured dots on phones. */}
                        <div className="hidden min-w-0 gap-[0.2rem] sm:grid">
                          {items.slice(0, CELL_LIMIT).map((entry) => (
                            <Chip key={entryKey(entry)} entry={entry} />
                          ))}
                          {items.length > CELL_LIMIT && (
                            <span className="px-[0.4em] text-[0.75rem] text-muted">
                              +{items.length - CELL_LIMIT} {t('calendar.more')}
                            </span>
                          )}
                        </div>
                        {items.length > 0 && (
                          <div className="flex flex-wrap gap-[0.2rem] px-[0.2rem] sm:hidden" aria-hidden="true">
                            {items.slice(0, 4).map((entry) => (
                              <span key={entryKey(entry)} className={`size-[0.45rem] rounded-full ${KIND_STYLE[entry.kind].dot}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Legend and honest notes */}
          {grid.state.kind === 'ok' && (
            <div className="mt-[1rem] grid gap-[0.5rem] text-[0.8125rem] text-muted">
              <ul className="flex list-none flex-wrap gap-x-[1.1rem] gap-y-[0.35rem] p-0">
                {ENTRY_KINDS.map((kind) => (
                  <li key={kind} className="inline-flex items-center gap-[0.4em]">
                    <span className={`size-[0.6rem] rounded-full ${KIND_STYLE[kind].dot}`} aria-hidden="true" />
                    {t(KIND_STYLE[kind].label)}
                  </li>
                ))}
                <li className="inline-flex items-center gap-[0.4em]">
                  <span className="size-[0.6rem] rounded-[0.15rem] bg-bg/40 ring-1 ring-border" aria-hidden="true" />
                  {t('calendar.legend.past')}
                </li>
              </ul>
              {hasUnreviewed(grid.state.data.entries) && (
                <p className="flex items-start gap-[0.5em]">
                  <Info className="mt-[0.1em] size-[1.1em] shrink-0" aria-hidden="true" />
                  {t('calendar.unreviewed')}
                </p>
              )}
              {grid.state.data.cropsWithoutCalendar > 0 && (
                <p className="flex items-start gap-[0.5em] tabular-nums">
                  <Info className="mt-[0.1em] size-[1.1em] shrink-0" aria-hidden="true" />
                  {grid.state.data.cropsWithoutCalendar}{' '}
                  {t(grid.state.data.cropsWithoutCalendar === 1 ? 'calendar.withoutOne' : 'calendar.withoutMany')}
                </p>
              )}
            </div>
          )}
        </section>

        {/* ─── Side panel: the day, coming up, done, and what to show ─── */}
        <aside aria-label={t('calendar.side')} className="grid gap-[1rem] xl:sticky xl:top-[1.5rem]">
          <section className="rounded-[1.25rem] bg-surface p-[clamp(0.9rem,2vw,1.25rem)]">
            <ChoiceGroup
              legend={t('calendar.side')}
              showLegend={false}
              options={[
                { value: 'day', label: t('calendar.view.day') },
                { value: 'upcoming', label: t('calendar.view.upcoming') },
                { value: 'done', label: t('calendar.view.done') },
              ]}
              value={panel}
              onChange={(value) => setPanel(value as Panel)}
            />
            <div className="mt-[0.9rem]">
              {panel === 'day' && (
                <>
                  <h3 className="px-[0.6rem] font-semibold capitalize">{formatIso(selected, locale, DAY_LABEL_FORMAT)}</h3>
                  <div className="mt-[0.4rem]">
                    <RowList entries={onDay(grid.state.kind === 'ok' ? grid.state.data.entries : [], selected)} empty={t('calendar.dayEmpty')} />
                  </div>
                  {selectedTime !== 'past' && (
                    <ButtonLink to={ROUTES.pages.app.eventNew(selected)} icon={CalendarPlus} variant="secondary" className="mt-[0.75rem] w-full">
                      {t('event.addOnDay')}
                    </ButtonLink>
                  )}
                </>
              )}
              {panel === 'upcoming' && <RowList entries={comingUp(listEntries, listToday)} empty={t('calendar.nothingAhead')} />}
              {panel === 'done' && <RowList entries={done(listEntries)} empty={t('calendar.nothingDone')} />}
            </div>
          </section>

          <section aria-labelledby="calendar-show" className="rounded-[1.25rem] bg-surface p-[clamp(0.9rem,2vw,1.25rem)]">
            <h3 id="calendar-show" className="font-semibold">
              {t('calendar.show')}
            </h3>
            <div className="mt-[0.6rem] flex flex-wrap gap-[0.4rem]">
              {ENTRY_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={shown[kind]}
                  onClick={() => setShown((current) => ({ ...current, [kind]: !current[kind] }))}
                  className={`inline-flex min-h-[2.5rem] cursor-pointer items-center gap-[0.45em] rounded-full px-[0.9em] text-[0.875rem] font-medium transition-colors ${
                    shown[kind] ? 'bg-bg text-fg' : 'text-muted line-through hover:bg-bg/60'
                  } ${FOCUS}`}
                >
                  <span className={`size-[0.6rem] rounded-full ${KIND_STYLE[kind].dot} ${shown[kind] ? '' : 'opacity-40'}`} aria-hidden="true" />
                  {t(KIND_STYLE[kind].label)}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
