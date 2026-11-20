// Add or edit a plot on a farm: name, size with acres or hectares, optional notes.
// Same pattern as FarmFormPage. Editing finds the plot in its farm's detail (the API
// has no single-plot read; the farm detail already carries every plot).
import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormScreen } from '@/components/app/FormScreen';
import { PlotSizeIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { ChoiceGroup } from '@/components/ui/ChoiceGroup';
import { TextField } from '@/components/ui/TextField';
import { useFarm } from '@/hooks/use-farm';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import {
  NAME_MAX,
  NOTES_MAX,
  plotSchema,
  presetFor,
  serverFieldErrors,
  SIZE_PRESETS,
  toPlotInput,
  type PlotFormValues,
  type SizePreset,
} from '@/lib/validation/farm';
import type { FarmDetail, Plot, SizeUnit } from '@/types/farm';

type Field = keyof PlotFormValues;

/** Starts on 50 by 100, the size most Kenyans name first. */
const EMPTY: PlotFormValues = { name: '', sizePreset: 'p50x100', ...SIZE_PRESETS.p50x100, notes: '' };

/** Route for both /farms/:farmId/plots/new and /farms/:farmId/plots/:plotId/edit. */
export default function PlotFormPage() {
  const { farmId = '', plotId } = useParams();
  const { t } = useLanguage();
  const { state } = useFarm(farmId);

  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind !== 'ok') {
    return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t(state.kind === 'notFound' ? 'farms.notFound.body' : state.message)}</p>;
  }
  const plot = plotId ? state.data.plots.find((item) => item.id === plotId) : undefined;
  if (plotId && !plot) return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t('plots.notFound')}</p>;
  return <PlotForm farm={state.data} plot={plot} />;
}

function PlotForm({ farm, plot }: { farm: FarmDetail; plot?: Plot }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [values, setValues] = useState<PlotFormValues>(
    plot
      ? {
          name: plot.name,
          sizePreset: presetFor(String(plot.size), plot.sizeUnit),
          size: String(plot.size),
          sizeUnit: plot.sizeUnit,
          notes: plot.notes ?? '',
        }
      : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusField, setFocusField] = useState<Field | null>(null);

  useEffect(() => {
    if (focusField) document.getElementById(`plot-${focusField}`)?.focus();
  }, [focusField]);

  const check = (field: Field, next: PlotFormValues) => {
    const parsed = plotSchema.safeParse(next);
    const issue = parsed.success ? undefined : parsed.error.issues.find((item) => item.path[0] === field);
    setErrors((current) => ({ ...current, [field]: issue?.message as MessageKey | undefined }));
  };
  const set = (field: Field, value: string) => {
    const next = { ...values, [field]: value } as PlotFormValues;
    setValues(next);
    if (touched[field]) check(field, next);
  };
  // A preset fills in size and unit; "Other size" keeps what was there so it can be typed.
  const choosePreset = (preset: SizePreset) => {
    const next: PlotFormValues =
      preset === 'other' ? { ...values, sizePreset: preset } : { ...values, sizePreset: preset, ...SIZE_PRESETS[preset] };
    setValues(next);
    setErrors((current) => ({ ...current, size: undefined, sizeUnit: undefined }));
    if (preset === 'other') setFocusField('size');
  };
  const blur = (field: Field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    check(field, values);
  };

  const backTo = ROUTES.pages.app.farm(farm.id);

  const submit = async () => {
    const parsed = plotSchema.safeParse(values);
    if (!parsed.success) {
      const found: Partial<Record<Field, MessageKey>> = {};
      for (const issue of parsed.error.issues) found[issue.path[0] as Field] ??= issue.message as MessageKey;
      setErrors(found);
      setTouched({ name: true, size: true, sizeUnit: true, notes: true });
      if (found.size || found.sizeUnit) setValues((current) => ({ ...current, sizePreset: 'other' }));
      setFocusField((['name', 'size', 'notes'] as const).find((field) => found[field]) ?? null);
      notify.warning(t('auth.validation.fixFields'));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const input = toPlotInput(parsed.data);
      if (plot) await apiClient.plots.update(plot.id, input);
      else await apiClient.plots.create(farm.id, input);
      notify.success(t(plot ? 'plots.saved' : 'plots.added'));
      navigate(backTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) {
        setErrors(serverFieldErrors<Field>('plot', err.issues));
      } else {
        setFormError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
      }
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title={t(plot ? 'plots.form.editTitle' : 'plots.form.addTitle')}
      lead={farm.name}
      Art={PlotSizeIllustration}
      backTo={backTo}
      backLabel={t('farms.backToFarm')}
      onSubmit={() => void submit()}
      submitLabel={t(plot ? 'common.save' : 'plots.add')}
      submitIcon={plot ? Check : Plus}
      submitting={submitting}
      formError={formError ? t(formError) : undefined}
    >
      <TextField
        id="plot-name"
        label={t('plots.field.name')}
        hint={t('plots.field.nameHint')}
        value={values.name}
        maxLength={NAME_MAX + 20}
        autoComplete="off"
        onChange={(event) => set('name', event.target.value)}
        onBlur={blur('name')}
        error={errors.name && t(errors.name)}
        valid={Boolean(touched.name && !errors.name && values.name.trim())}
        validLabel={t('auth.field.valid')}
      />
      <div className="grid gap-[0.75rem]">
        {/* The sizes Kenyan farmers name, then "Other size" for anything else. */}
        <ChoiceGroup
          legend={t('plots.field.size')}
          showLegend
          options={[
            { value: 'p50x100', label: t('plots.unit.p50x100') },
            { value: 'p100x100', label: t('plots.unit.p100x100') },
            { value: 'acre1', label: t('plots.preset.acre1') },
            { value: 'other', label: t('plots.preset.other') },
          ]}
          value={values.sizePreset}
          onChange={(value) => choosePreset(value as SizePreset)}
        />
        {values.sizePreset === 'other' && (
          <div className="grid gap-[0.75rem] rounded-[1rem] bg-bg p-[1rem]">
            <TextField
              id="plot-size"
              label={t('plots.field.amount')}
              hint={t('plots.field.sizeHint')}
              inputMode="decimal"
              value={values.size}
              onChange={(event) => set('size', event.target.value)}
              onBlur={blur('size')}
              error={errors.size && t(errors.size)}
            />
            <ChoiceGroup
              legend={t('plots.field.unit')}
              showLegend
              options={[
                { value: 'acres', label: t('plots.unit.acres') },
                { value: 'hectares', label: t('plots.unit.hectares') },
                { value: 'plots_50x100', label: t('plots.unit.many50x100') },
              ]}
              value={values.sizeUnit}
              onChange={(value) => set('sizeUnit', value as SizeUnit)}
              error={errors.sizeUnit && t(errors.sizeUnit)}
            />
          </div>
        )}
      </div>
      <TextField
        id="plot-notes"
        label={`${t('plots.field.notes')} (${t('common.optional')})`}
        hint={t('plots.field.notesHint')}
        value={values.notes}
        maxLength={NOTES_MAX + 20}
        onChange={(event) => set('notes', event.target.value)}
        onBlur={blur('notes')}
        error={errors.notes && t(errors.notes)}
      />
    </FormScreen>
  );
}
