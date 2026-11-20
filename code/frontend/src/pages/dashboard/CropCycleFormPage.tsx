// Start a crop on a plot, or edit one: which crop (any crop in the catalogue, or one
// the farmer names), an optional variety, and the planting date (today by default).
// The crop itself cannot change after starting: that would be a different crop, so
// it is fixed on the edit screen.
// Two ways in (Matt, 2026-11-19): from a plot on a farm page (farm and plot already
// known), or from the Crops page, where the farmer first picks the farm and the plot.
import { useCallback, useState, type ReactNode } from 'react';
import { Check, LandPlot, Plus, Sprout } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { FormScreen } from '@/components/app/FormScreen';
import { ChooseCropIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { DatePicker } from '@/components/ui/DatePicker';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { TextField } from '@/components/ui/TextField';
import { useCropCycle, useOpenCycles } from '@/hooks/use-crops';
import { useResource } from '@/hooks/use-resource';
import { useFarm } from '@/hooks/use-farm';
import { useForm } from '@/hooks/use-form';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { CROP_LABELS, CROP_ORDER, cropName } from '@/lib/crops';
import { isoDayFromToday } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import {
  CUSTOM_CROP_MAX,
  cycleSchema,
  plantedOnRange,
  serverIssues,
  VARIETY_MAX,
  type CycleFormValues,
} from '@/lib/validation/crop';
import type { CropCycleDetail, CropCycleInput } from '@/types/crop';

const ORDER = ['crop', 'customCrop', 'variety', 'plantedOn'] as const;

/** Route for /farms/:farmId/plots/:plotId/crops/new, /crops/new and /crops/:cycleId/edit. */
export default function CropCycleFormPage() {
  const { farmId, plotId, cycleId } = useParams();
  if (cycleId) return <EditCycle cycleId={cycleId} />;
  if (!farmId || !plotId) return <NewCycleAnywhere />;
  return <NewCycle farmId={farmId} plotId={plotId} />;
}

function Problem({ message }: { message: MessageKey }) {
  const { t } = useLanguage();
  return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t(message)}</p>;
}

function NewCycle({ farmId, plotId }: { farmId: string; plotId: string }) {
  const { state } = useFarm(farmId);
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'notFound') return <Problem message="farms.notFound.body" />;
  if (state.kind === 'error') return <Problem message={state.message} />;
  const plot = state.data.plots.find((item) => item.id === plotId);
  if (!plot) return <Problem message="plots.notFound" />;
  return <CycleForm farmId={farmId} plotId={plotId} lead={`${plot.name}, ${state.data.name}`} />;
}

/**
 * Started from the Crops page: choose the farm, then one of its plots that has no
 * growing crop (one open crop per plot), then the crop as usual.
 */
function NewCycleAnywhere() {
  const { t } = useLanguage();
  const farms = useResource(useCallback(() => apiClient.farms.list(1, 100), []));
  const open = useOpenCycles();
  const [farmId, setFarmId] = useState('');
  const [plotId, setPlotId] = useState('');
  const [errors, setErrors] = useState<{ farm?: MessageKey; plot?: MessageKey }>({});
  const farm = useResource(useCallback(() => (farmId ? apiClient.farms.get(farmId) : Promise.resolve(null)), [farmId]));

  if (farms.state.kind === 'loading' || open.state.kind === 'loading') return <LoadingState />;
  if (farms.state.kind !== 'ok') return <Problem message={farms.state.kind === 'error' ? farms.state.message : 'error.generic'} />;
  if (farms.state.data.items.length === 0)
    return (
      <div className="grid gap-[1rem] rounded-[1rem] bg-surface p-[1.5rem]">
        <p className="text-muted">{t('cycle.place.noFarms')}</p>
        <Link to={ROUTES.pages.app.farmNew} className="inline-flex w-fit items-center gap-[0.4em] font-semibold text-primary underline-offset-4 hover:underline">
          <Plus className="size-[1.1em]" aria-hidden="true" />
          {t('app.farms.add')}
        </Link>
      </div>
    );

  const busyPlots = new Set(open.state.kind === 'ok' ? open.state.data.items.map((cycle) => cycle.plotId) : []);
  const plots = farm.state.kind === 'ok' && farm.state.data ? farm.state.data.plots : [];
  const freePlots = plots.filter((plot) => !busyPlots.has(plot.id));
  const farmName = farms.state.data.items.find((item) => item.id === farmId)?.name;
  const plotName = plots.find((plot) => plot.id === plotId)?.name;

  const check = () => {
    const found = { farm: farmId ? undefined : ('cycle.place.farmRequired' as const), plot: plotId ? undefined : ('cycle.place.plotRequired' as const) };
    setErrors(found);
    if (found.farm) document.getElementById('cycle-farm')?.focus();
    else if (found.plot) document.getElementById('cycle-plot')?.focus();
    return !found.farm && !found.plot;
  };

  const picker = (
    <div className="grid gap-[1.1rem] sm:grid-cols-2">
      <SearchSelect
        id="cycle-farm"
        label={t('cycle.place.farm')}
        options={farms.state.data.items.map((item) => ({ value: item.id, label: item.name }))}
        value={farmId || null}
        onChange={(value) => {
          setFarmId(value);
          setPlotId('');
          setErrors({});
        }}
        placeholder={t('cycle.place.farmPlaceholder')}
        searchLabel={t('cycle.place.farmSearch')}
        noResultsLabel={t('cycle.place.none')}
        error={errors.farm ? t(errors.farm) : undefined}
      />
      <div className="grid gap-[0.4rem]">
        <SearchSelect
          id="cycle-plot"
          label={t('cycle.place.plot')}
          options={freePlots.map((plot) => ({ value: plot.id, label: plot.name }))}
          value={plotId || null}
          onChange={(value) => {
            setPlotId(value);
            setErrors((current) => ({ ...current, plot: undefined }));
          }}
          placeholder={t(farmId ? 'cycle.place.plotPlaceholder' : 'cycle.place.farmFirst')}
          searchLabel={t('cycle.place.plotSearch')}
          noResultsLabel={t('cycle.place.none')}
          disabled={!farmId || farm.state.kind !== 'ok'}
          error={errors.plot ? t(errors.plot) : undefined}
        />
        {farmId && farm.state.kind === 'ok' && freePlots.length === 0 && (
          <p className="text-[0.875rem] text-muted">
            {t(plots.length === 0 ? 'cycle.place.noPlots' : 'cycle.place.allBusy')}{' '}
            <Link to={ROUTES.pages.app.plotNew(farmId)} className="inline-flex items-center gap-[0.3em] font-semibold text-primary underline-offset-4 hover:underline">
              <LandPlot className="size-[1em]" aria-hidden="true" />
              {t('plots.add')}
            </Link>
          </p>
        )}
      </div>
    </div>
  );

  return (
    <CycleForm
      farmId={farmId}
      plotId={plotId}
      lead={plotName && farmName ? `${plotName}, ${farmName}` : t('cycle.place.lead')}
      picker={picker}
      beforeSubmit={check}
      backTo={ROUTES.pages.app.crops}
      backLabel={t('cycle.backToCrops')}
    />
  );
}

function EditCycle({ cycleId }: { cycleId: string }) {
  const { state } = useCropCycle(cycleId);
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind === 'notFound') return <Problem message="cycle.notFound" />;
  if (state.kind === 'error') return <Problem message={state.message} />;
  return (
    <CycleForm
      farmId={state.data.farmId}
      plotId={state.data.plotId}
      lead={`${state.data.plotName}, ${state.data.farmName}`}
      cycle={state.data}
    />
  );
}

interface CycleFormProps {
  farmId: string;
  plotId: string;
  lead: string;
  cycle?: CropCycleDetail;
  /** Farm and plot choosers, when the crop is started from the Crops page. */
  picker?: ReactNode;
  /** Checks the choosers first; false stops the save. */
  beforeSubmit?: () => boolean;
  backTo?: string;
  backLabel?: string;
}

function CycleForm({ farmId, plotId, lead, cycle, picker, beforeSubmit, backTo, backLabel }: CycleFormProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const schema = useCallback(() => cycleSchema(), []);
  const form = useForm<CycleFormValues, CropCycleInput>(
    cycle
      ? { crop: cycle.crop, customCrop: cycle.customCrop ?? '', variety: cycle.variety ?? '', plantedOn: cycle.plantedOn }
      : { crop: '', customCrop: '', variety: '', plantedOn: isoDayFromToday(0) },
    schema,
    ORDER,
    'cycle',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const { min, max } = plantedOnRange();

  const cropOptions = CROP_ORDER.map((crop) => ({ value: crop, label: t(CROP_LABELS[crop]) }));

  const submit = async () => {
    const placeOk = beforeSubmit ? beforeSubmit() : true;
    const input = form.validate();
    if (!input || !placeOk) return;
    setSubmitting(true);
    setFormError(null);
    try {
      if (cycle) {
        await apiClient.cycles.update(cycle.id, { variety: input.variety, plantedOn: input.plantedOn });
        notify.success(t('cycle.saved'));
        navigate(ROUTES.pages.app.crop(cycle.id), { replace: true });
      } else {
        const started = await apiClient.cycles.start(plotId, input);
        notify.success(t('cycle.started'));
        navigate(ROUTES.pages.app.crop(started.id), { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) form.setErrors(serverIssues('cycle', err.issues));
      else setFormError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title={cycle ? `${t('cycle.form.editTitle')}: ${cropName(cycle, t)}` : t('cycle.form.startTitle')}
      lead={lead}
      Art={ChooseCropIllustration}
      backTo={backTo ?? (cycle ? ROUTES.pages.app.crop(cycle.id) : ROUTES.pages.app.farm(farmId))}
      backLabel={backLabel ?? t(cycle ? 'cycle.backToCrop' : 'farms.backToFarm')}
      onSubmit={() => void submit()}
      submitLabel={t(cycle ? 'common.save' : 'cycle.start')}
      submitIcon={cycle ? Check : Sprout}
      submitting={submitting}
      formError={formError ? t(formError) : undefined}
    >
      {picker}
      {!cycle && (
        <>
          <SearchSelect
            id="cycle-crop"
            label={t('cycle.field.crop')}
            options={cropOptions}
            value={form.values.crop || null}
            onChange={(value) => form.pick('crop', value)}
            onBlur={form.blur('crop')}
            placeholder={t('cycle.field.cropPlaceholder')}
            searchLabel={t('cycle.field.cropSearch')}
            noResultsLabel={t('cycle.field.cropNone')}
            error={form.error('crop')}
          />
          {form.values.crop === 'other' && (
            <TextField
              id="cycle-customCrop"
              label={t('cycle.field.customCrop')}
              hint={t('cycle.field.customCropHint')}
              value={form.values.customCrop}
              maxLength={CUSTOM_CROP_MAX + 20}
              onChange={(event) => form.set('customCrop', event.target.value)}
              onBlur={form.blur('customCrop')}
              error={form.error('customCrop')}
            />
          )}
        </>
      )}
      <TextField
        id="cycle-variety"
        label={`${t('cycle.field.variety')} (${t('common.optional')})`}
        hint={t('cycle.field.varietyHint')}
        value={form.values.variety}
        maxLength={VARIETY_MAX + 20}
        onChange={(event) => form.set('variety', event.target.value)}
        onBlur={form.blur('variety')}
        error={form.error('variety')}
      />
      <DatePicker
        id="cycle-plantedOn"
        label={t('cycle.field.plantedOn')}
        hint={t('cycle.field.plantedOnHint')}
        value={form.values.plantedOn || null}
        min={min}
        max={max}
        onChange={(value) => form.pick('plantedOn', value)}
        onBlur={form.blur('plantedOn')}
        error={form.error('plantedOn')}
        todayLabel={t('app.today')}
        previousMonthLabel={t('date.previousMonth')}
        nextMonthLabel={t('date.nextMonth')}
        chooseDateLabel={t('date.choose')}
      />
    </FormScreen>
  );
}
