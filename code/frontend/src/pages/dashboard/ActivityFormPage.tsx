// Log or edit an activity on a crop: what was done (picture tiles), when (today by
// default), and optionally what was used, how much, what it cost and a note.
// Only "what" and "when" are needed, so recording takes two taps in the field.
import { useCallback, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { ActivityKindPicker } from '@/components/app/ActivityKindPicker';
import { FormScreen } from '@/components/app/FormScreen';
import { RecordWorkIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { DatePicker } from '@/components/ui/DatePicker';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { TextField } from '@/components/ui/TextField';
import { useActivities, useCropCycle } from '@/hooks/use-crops';
import { useForm } from '@/hooks/use-form';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { cropName, UNIT_LABELS, UNIT_ORDER } from '@/lib/crops';
import { isoDayFromToday } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import {
  activitySchema,
  doneOnRange,
  INPUT_MAX,
  NOTES_MAX,
  serverIssues,
  type ActivityFormValues,
} from '@/lib/validation/crop';
import type { Activity, ActivityInput, CropCycleDetail } from '@/types/crop';

const ORDER = ['kind', 'doneOn', 'input', 'quantity', 'quantityUnit', 'costKes', 'notes'] as const;

/** Route for /crops/:cycleId/activities/new and /crops/:cycleId/activities/:activityId/edit. */
export default function ActivityFormPage() {
  const { cycleId = '', activityId } = useParams();
  const { t } = useLanguage();
  const cycle = useCropCycle(cycleId);
  // Editing finds the activity in the cycle's list (most farmers have far fewer than 100).
  const activities = useActivities(cycleId, 1);

  if (cycle.state.kind === 'loading' || (activityId && activities.state.kind === 'loading')) return <LoadingState />;
  if (cycle.state.kind !== 'ok') {
    const message: MessageKey = cycle.state.kind === 'error' ? cycle.state.message : 'cycle.notFound';
    return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t(message)}</p>;
  }
  const activity =
    activityId && activities.state.kind === 'ok' ? activities.state.data.items.find((item) => item.id === activityId) : undefined;
  if (activityId && !activity) return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t('activity.notFound')}</p>;
  return <ActivityForm cycle={cycle.state.data} activity={activity} />;
}

function ActivityForm({ cycle, activity }: { cycle: CropCycleDetail; activity?: Activity }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const schema = useCallback(() => activitySchema(cycle.plantedOn), [cycle.plantedOn]);
  const form = useForm<ActivityFormValues, ActivityInput>(
    activity
      ? {
          kind: activity.kind,
          doneOn: activity.doneOn,
          input: activity.input ?? '',
          quantity: activity.quantity === null ? '' : String(activity.quantity),
          quantityUnit: activity.quantityUnit ?? '',
          costKes: activity.costKes === null ? '' : String(activity.costKes),
          notes: activity.notes ?? '',
        }
      : { kind: '', doneOn: isoDayFromToday(0), input: '', quantity: '', quantityUnit: '', costKes: '', notes: '' },
    schema,
    ORDER,
    'activity',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const { min, max } = doneOnRange(cycle.plantedOn);
  const backTo = ROUTES.pages.app.crop(cycle.id);

  const submit = async () => {
    const input = form.validate();
    if (!input) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (activity) await apiClient.activities.update(activity.id, input);
      else await apiClient.activities.add(cycle.id, input);
      notify.success(t(activity ? 'activity.saved' : 'activity.added'));
      navigate(backTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) form.setErrors(serverIssues('activity', err.issues));
      else setFormError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title={t(activity ? 'activity.form.editTitle' : 'activity.form.addTitle')}
      lead={`${cropName(cycle, t)}, ${cycle.plotName}`}
      Art={RecordWorkIllustration}
      backTo={backTo}
      backLabel={t('cycle.backToCrop')}
      onSubmit={() => void submit()}
      submitLabel={t(activity ? 'common.save' : 'activity.add')}
      submitIcon={activity ? Check : Plus}
      submitting={submitting}
      formError={formError ? t(formError) : undefined}
    >
      <ActivityKindPicker
        id="activity-kind"
        legend={t('activity.field.kind')}
        value={form.values.kind}
        onChange={(kind) => form.pick('kind', kind)}
        error={form.error('kind')}
      />
      <DatePicker
        id="activity-doneOn"
        label={t('activity.field.doneOn')}
        value={form.values.doneOn || null}
        min={min}
        max={max}
        onChange={(value) => form.pick('doneOn', value)}
        onBlur={form.blur('doneOn')}
        error={form.error('doneOn')}
        todayLabel={t('app.today')}
        previousMonthLabel={t('date.previousMonth')}
        nextMonthLabel={t('date.nextMonth')}
        chooseDateLabel={t('date.choose')}
      />

      {/* Everything below is optional: grouped and quieter, so the two taps above are enough. */}
      <div className="grid gap-[1.1rem] rounded-[1rem] bg-bg p-[1rem]">
        <p className="text-[0.9375rem] font-medium text-muted">{t('activity.optionalGroup')}</p>
        <TextField
          id="activity-input"
          label={t('activity.field.input')}
          hint={t('activity.field.inputHint')}
          value={form.values.input}
          maxLength={INPUT_MAX + 20}
          onChange={(event) => form.set('input', event.target.value)}
          onBlur={form.blur('input')}
          error={form.error('input')}
        />
        <div className="grid gap-[1.1rem] sm:grid-cols-2">
          <TextField
            id="activity-quantity"
            label={t('activity.field.quantity')}
            inputMode="decimal"
            value={form.values.quantity}
            onChange={(event) => form.set('quantity', event.target.value)}
            onBlur={form.blur('quantity')}
            error={form.error('quantity')}
          />
          <SearchSelect
            id="activity-quantityUnit"
            label={t('activity.field.unit')}
            options={UNIT_ORDER.map((unit) => ({ value: unit, label: t(UNIT_LABELS[unit]) }))}
            value={form.values.quantityUnit || null}
            onChange={(value) => form.pick('quantityUnit', value)}
            onBlur={form.blur('quantityUnit')}
            placeholder={t('activity.field.unitPlaceholder')}
            searchLabel={t('activity.field.unitSearch')}
            noResultsLabel={t('activity.field.unitNone')}
            error={form.error('quantityUnit')}
          />
        </div>
        <TextField
          id="activity-costKes"
          label={t('activity.field.cost')}
          hint={t('activity.field.costHint')}
          inputMode="numeric"
          value={form.values.costKes}
          onChange={(event) => form.set('costKes', event.target.value)}
          onBlur={form.blur('costKes')}
          error={form.error('costKes')}
        />
        <TextField
          id="activity-notes"
          label={t('activity.field.notes')}
          value={form.values.notes}
          maxLength={NOTES_MAX + 20}
          onChange={(event) => form.set('notes', event.target.value)}
          onBlur={form.blur('notes')}
          error={form.error('notes')}
        />
      </div>
    </FormScreen>
  );
}
