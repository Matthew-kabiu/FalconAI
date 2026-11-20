// Farms and plots as falcon-api returns them (api/openapi.yaml → Farm, FarmDetail, Plot).
import type { County } from '@/lib/counties';

/** `plots_50x100`: the size is a NUMBER of 50 by 100 ft plots (1 = "50 by 100", 2 = "100 by 100"). */
export type SizeUnit = 'acres' | 'hectares' | 'plots_50x100';

export interface Farm {
  id: string;
  name: string;
  county: County;
  locality: string | null;
  plotCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Plot {
  id: string;
  farmId: string;
  name: string;
  size: number;
  sizeUnit: SizeUnit;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FarmDetail extends Farm {
  plots: Plot[];
}

export interface FarmInput {
  name: string;
  county: County;
  locality: string | null;
}

export interface PlotInput {
  name: string;
  size: number;
  sizeUnit: SizeUnit;
  notes: string | null;
}

/** `meta` on paged list responses. */
export interface PageMeta {
  page: number;
  perPage: number;
  total: number;
}

export interface Page<T, M extends PageMeta = PageMeta> {
  items: T[];
  meta: M;
}
