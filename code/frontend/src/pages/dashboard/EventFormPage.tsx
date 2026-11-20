// Put your own event on the farm calendar, or change or remove one (Matt, 2026-11-19):
// a title, an optional description, the date (today or later), all day or a time in
// Kenya time, and optional notes. No crop picker: an event stands on its own.
import { useCallback, useState } from 'react';
import { CalendarPlus, Check, Trash2 } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormScreen } from '@/components/app/FormScreen';
import { PlantingDateIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { DatePicker } from '@/components/ui/DatePicker';
import { isIsoDate } from '@/components/ui/date-picker';
import { TextAreaField } from '@/components/ui/TextAreaField';
import { TextField } from '@/components/ui/TextField';
import { TimePicker } from '@/components/ui/TimePicker';
import { useFarmEvent } from '@/hooks/use-crops';
import { useForm } from '@/hooks/use-form';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import {
  EVENT_DESCRIPTION_MAX,
  EVENT_NOTES_MAX,
  EVENT_TITLE_MAX,
  eventDateRange,
  eventSchema,
  eventServerIssues,
  type EventFormValues,
} from '@/lib/validation/event';
import type { FarmEvent, FarmEventInput } from '@/types/crop';

const ORDER = ['title', 'description', 'date', 'time', 'notes'] as const;

/** Route for /calendar/events/new(?date=YYYY-MM-DD) and /calendar/events/:eventId/edit. */
export default function EventFormPage() {
  const { eventId } = useParams();
  const { t } = useLanguage();
  const { state } = useFarmEvent(eventId);

  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind !== 'ok' || (eventId && !state.data)) {
    const message: MessageKey = state.kind === 'error' ? state.message : 'event.notFound';
    return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t(message)}</p>;
  }
  return <EventForm event={state.data ?? undefined} />;
}

function EventForm({ event }: { event?: FarmEvent }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { min, max } = eventDateRange();
  const askedDate = params.get('date');
  const startDate = isIsoDate(askedDate) && askedDate >= min && askedDate <= max ? askedDate : min;

  const schema = useCallback(() => eventSchema(event?.date), [event?.date]);
  const form = useForm<EventFormValues, FarmEventInput>(
    event
      ? {
          title: event.title,
          description: event.description ?? '',
          date: event.date,
          allDay: event.time ? '' : 'yes',
          time: event.time ?? '',
          notes: event.notes ?? '',
        }
      : { title: '', description: '', date: startDate, allDay: 'yes', time: '', notes: '' },
    schema,
    ORDER,
    'event',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [removing, setRemoving] = useState(false);
  const backTo = ROUTES.pages.app.calendar;
  const allDay = form.values.allDay === 'yes';

  const submit = async () => {
    const input = form.validate();
    if (!input) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (event) {
        // Only send the date when it changed, so an event already in the past can still be edited.
        const { date, ...rest } = input;
        await apiClient.events.update(event.id, date === event.date ? rest : input);
      } else {
        await apiClient.events.create(input);
      }
      notify.success(t(event ? 'event.saved' : 'event.added'));
      navigate(backTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) form.setErrors(eventServerIssues(err.issues));
      else setFormError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!event) return;
    setRemoving(true);
    try {
      await apiClient.events.remove(event.id);
      notify.success(t('event.removed'));
      navigate(backTo, { replace: true });
    } catch (err) {
      notify.error(err, t);
      setRemoving(false);
      setConfirming(false);
    }
  };

  return (
    <FormScreen
      title={t(event ? 'event.form.editTitle' : 'event.form.addTitle')}
      lead={t('event.form.lead')}
      Art={PlantingDateIllustration}
      backTo={backTo}
      backLabel={t('event.backToCalendar')}
      onSubmit={() => void submit()}
      submitLabel={t(event ? 'common.save' : 'event.add')}
      submitIcon={event ? Check : CalendarPlus}
      submitting={submitting}
      formError={formError ? t(formError) : undefined}
    >
      <TextField
        id="event-title"
        label={t('event.field.title')}
        hint={t('event.field.titleHint')}
        value={form.values.title}
        maxLength={EVENT_TITLE_MAX + 20}
        onChange={(e) => form.set('title', e.target.value)}
        onBlur={form.blur('title')}
        error={form.error('title')}
      />
      <TextAreaField
        id="event-description"
        label={`${t('event.field.description')} (${t('common.optional')})`}
        rows={3}
        value={form.values.description}
        maxLength={EVENT_DESCRIPTION_MAX + 20}
        onChange={(e) => form.set('description', e.target.value)}
        onBlur={form.blur('description')}
        error={form.error('description')}
      />

      {/* When: the date, then all day or a time (Kenya time). */}
      <div className="grid gap-[1.1rem] sm:grid-cols-2">
        <DatePicker
          id="event-date"
          label={t('event.field.date')}
          value={form.values.date || null}
          min={event && event.date < min ? event.date : min}
          max={max}
          onChange={(value) => form.pick('date', value)}
          onBlur={form.blur('date')}
          error={form.error('date')}
          todayLabel={t('app.today')}
          previousMonthLabel={t('date.previousMonth')}
          nextMonthLabel={t('date.nextMonth')}
          chooseDateLabel={t('date.choose')}
        />
        {/* Always shown and usable: an event can be at a set time. While All-day is ticked it reads
            "All day"; choosing a time unticks it, ticking All-day clears the time. */}
        <TimePicker
            id="event-time"
            label={t('event.field.time')}
            value={allDay ? '' : form.values.time}
            // Picking a time means it is not an all-day event.
            onChange={(value) => form.pick('time', value, { allDay: '' } as Partial<EventFormValues>)}
            onBlur={form.blur('time')}
            placeholder={t(allDay ? 'event.allDayShown' : 'event.field.timePlaceholder')}
            hoursLabel={t('event.field.hours')}
            minutesLabel={t('event.field.minutes')}
            closeLabel={t('common.close')}
            hint={t('calendar.timeZone')}
            error={allDay ? undefined : form.error('time')}
          />
      </div>
      <label htmlFor="event-allDay" className="flex w-fit cursor-pointer items-center gap-[0.7em] rounded-[0.6rem] py-[0.25rem] font-medium">
        <input
          id="event-allDay"
          type="checkbox"
          checked={allDay}
          onChange={(e) => form.pick('allDay', e.target.checked ? 'yes' : '', e.target.checked ? { time: '' } : {})}
          className="size-[1.25rem] cursor-pointer rounded-[0.3rem] accent-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        />
        {t('event.field.allDay')}
      </label>

      <TextAreaField
        id="event-notes"
        label={`${t('activity.field.notes')} (${t('common.optional')})`}
        rows={3}
        value={form.values.notes}
        maxLength={EVENT_NOTES_MAX + 20}
        onChange={(e) => form.set('notes', e.target.value)}
        onBlur={form.blur('notes')}
        error={form.error('notes')}
      />

      {event && (
        <>
          <Button type="button" variant="ghost" icon={Trash2} className="w-fit text-danger" onClick={() => setConfirming(true)}>
            {t('event.remove')}
          </Button>
          <ConfirmDialog
            open={confirming}
            title={t('event.removeTitle')}
            body={t('event.removeBody')}
            confirmLabel={t('event.remove')}
            cancelLabel={t('common.cancel')}
            onConfirm={() => void remove()}
            onCancel={() => setConfirming(false)}
            pending={removing}
          />
        </>
      )}
    </FormScreen>
  );
}
