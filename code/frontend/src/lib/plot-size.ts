// A plot size the way the farmer said it: "50 by 100", "100 by 100", "3 x 50 by 100",
// "0.5 acres", "1 hectare". Numbers keep up to 2 decimals, in the active language.
import type { Language, Translate } from '@/lib/i18n';
import type { SizeUnit } from '@/types/farm';

const LOCALES: Record<Language, string> = { en: 'en-KE', sw: 'sw-KE' };

export function formatPlotSize(size: number, unit: SizeUnit, language: Language, t: Translate): string {
  const number = new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 2 }).format(size);
  const one = size === 1;
  switch (unit) {
    case 'plots_50x100':
      if (size === 1) return t('plots.unit.p50x100');
      if (size === 2) return t('plots.unit.p100x100');
      return `${number} \u00d7 ${t('plots.unit.p50x100')}`;
    case 'acres':
      return `${number} ${t(one ? 'plots.unit.acre' : 'plots.unit.acres')}`;
    case 'hectares':
      return `${number} ${t(one ? 'plots.unit.hectare' : 'plots.unit.hectares')}`;
  }
}
