// Add or edit a farm: name, county (searchable list of 47), optional village or area.
// Fields are checked when the farmer leaves them; the API re-checks and any problem
// it finds is shown under the same field. After adding, the farm opens so the next
// step (add a plot) is right there.
import { useEffect, useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { FormScreen } from '@/components/app/FormScreen';
import { NameFarmIllustration } from '@/components/app/TutorialIllustrations';
import { LoadingState } from '@/components/feedback/LoadingState';
import { notify } from '@/components/feedback/toast';
import { SearchSelect } from '@/components/ui/SearchSelect';
import { TextField } from '@/components/ui/TextField';
import { useFarm } from '@/hooks/use-farm';
import { useLanguage } from '@/hooks/use-language';
import { apiClient, ApiClientError } from '@/lib/api/apiClient';
import { COUNTIES } from '@/lib/counties';
import type { MessageKey } from '@/lib/i18n';
import { ROUTES } from '@/lib/routes';
import { farmSchema, LOCALITY_MAX, NAME_MAX, serverFieldErrors, toFarmInput, type FarmFormValues } from '@/lib/validation/farm';
import type { FarmDetail } from '@/types/farm';

type Field = keyof FarmFormValues;

const EMPTY: FarmFormValues = { name: '', county: '', locality: '' };

/** Route for both /farms/new and /farms/:farmId/edit. */
export default function FarmFormPage() {
  const { farmId } = useParams();
  return farmId ? <EditFarm farmId={farmId} /> : <FarmForm />;
}

function EditFarm({ farmId }: { farmId: string }) {
  const { t } = useLanguage();
  const { state } = useFarm(farmId);
  if (state.kind === 'loading') return <LoadingState />;
  if (state.kind !== 'ok') {
    return <p className="rounded-[1rem] bg-surface p-[1.5rem] text-muted">{t(state.kind === 'notFound' ? 'farms.notFound.body' : state.message)}</p>;
  }
  return <FarmForm farm={state.data} />;
}

function FarmForm({ farm }: { farm?: FarmDetail }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [values, setValues] = useState<FarmFormValues>(
    farm ? { name: farm.name, county: farm.county, locality: farm.locality ?? '' } : EMPTY,
  );
  const [errors, setErrors] = useState<Partial<Record<Field, MessageKey>>>({});
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [formError, setFormError] = useState<MessageKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const check = (field: Field, next: FarmFormValues) => {
    const parsed = farmSchema.safeParse(next);
    const issue = parsed.success ? undefined : parsed.error.issues.find((item) => item.path[0] === field);
    setErrors((current) => ({ ...current, [field]: issue?.message as MessageKey | undefined }));
  };
  const set = (field: Field, value: string) => {
    const next = { ...values, [field]: value } as FarmFormValues;
    setValues(next);
    if (touched[field]) check(field, next);
  };
  const blur = (field: Field) => () => {
    setTouched((current) => ({ ...current, [field]: true }));
    check(field, values);
  };

  // Put the cursor in the first field with a problem after a failed save.
  const [focusField, setFocusField] = useState<Field | null>(null);
  useEffect(() => {
    if (focusField) document.getElementById(`farm-${focusField}`)?.focus();
  }, [focusField]);

  const submit = async () => {
    const parsed = farmSchema.safeParse(values);
    if (!parsed.success) {
      const found: Partial<Record<Field, MessageKey>> = {};
      for (const issue of parsed.error.issues) found[issue.path[0] as Field] ??= issue.message as MessageKey;
      setErrors(found);
      setTouched({ name: true, county: true, locality: true });
      setFocusField((['name', 'county', 'locality'] as const).find((field) => found[field]) ?? null);
      notify.warning(t('auth.validation.fixFields'));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const input = toFarmInput(parsed.data);
      if (farm) {
        await apiClient.farms.update(farm.id, input);
        notify.success(t('farms.saved'));
        navigate(ROUTES.pages.app.farm(farm.id), { replace: true });
      } else {
        const created = await apiClient.farms.create(input);
        notify.success(t('farms.added'));
        navigate(ROUTES.pages.app.farm(created.id), { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.issues.length > 0) {
        setErrors(serverFieldErrors<Field>('farm', err.issues));
      } else {
        setFormError(err instanceof ApiClientError ? err.userMessage : 'error.generic');
      }
      setSubmitting(false);
    }
  };

  return (
    <FormScreen
      title={t(farm ? 'farms.form.editTitle' : 'farms.form.addTitle')}
      lead={t('farms.form.lead')}
      Art={NameFarmIllustration}
      backTo={farm ? ROUTES.pages.app.farm(farm.id) : ROUTES.pages.app.farms}
      backLabel={t(farm ? 'farms.backToFarm' : 'farms.allFarms')}
      onSubmit={() => void submit()}
      submitLabel={t(farm ? 'common.save' : 'app.farms.add')}
      submitIcon={farm ? Check : Plus}
      submitting={submitting}
      formError={formError ? t(formError) : undefined}
    >
      <TextField
        id="farm-name"
        label={t('farms.field.name')}
        hint={t('farms.field.nameHint')}
        value={values.name}
        maxLength={NAME_MAX + 20}
        autoComplete="off"
        onChange={(event) => set('name', event.target.value)}
        onBlur={blur('name')}
        error={errors.name && t(errors.name)}
        valid={Boolean(touched.name && !errors.name && values.name.trim())}
        validLabel={t('auth.field.valid')}
      />
      <SearchSelect
        id="farm-county"
        label={t('farms.field.county')}
        options={COUNTIES}
        value={values.county || null}
        onChange={(value) => {
          const next = { ...values, county: value as FarmFormValues['county'] };
          setValues(next);
          setTouched((current) => ({ ...current, county: true }));
          check('county', next);
        }}
        onBlur={blur('county')}
        placeholder={t('farms.field.countyPlaceholder')}
        searchLabel={t('farms.field.countySearch')}
        noResultsLabel={t('farms.field.countyNone')}
        error={errors.county && t(errors.county)}
      />
      <TextField
        id="farm-locality"
        label={`${t('farms.field.locality')} (${t('common.optional')})`}
        hint={t('farms.field.localityHint')}
        value={values.locality}
        maxLength={LOCALITY_MAX + 20}
        onChange={(event) => set('locality', event.target.value)}
        onBlur={blur('locality')}
        error={errors.locality && t(errors.locality)}
      />
    </FormScreen>
  );
}
