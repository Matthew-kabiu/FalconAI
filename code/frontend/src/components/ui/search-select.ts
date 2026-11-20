// Helpers for SearchSelect, kept apart so the component file only exports components.

/** Lower-case and strip accents, so "muranga" finds "Murang'a" and "e" finds "é". */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();
}

/** Space (in rem) the open popup needs: search box plus the scrolling list. */
export const POPUP_HEIGHT_REM = 20;
