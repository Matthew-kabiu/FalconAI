// Crop data hooks, all built on useResource (loading / ok / notFound / error).
import { useCallback } from 'react';
import { useResource } from '@/hooks/use-resource';
import { apiClient } from '@/lib/api/apiClient';

/** The crop catalogue (which crops exist, which have a sourced calendar). */
export function useCropCatalogue() {
  return useResource(useCallback(() => apiClient.crops.catalogue(), []));
}

/** All my crop cycles, filtered to growing (`open`) or finished (`closed`). */
export function useCropCycles(status: 'open' | 'closed', page: number) {
  return useResource(useCallback(() => apiClient.cycles.list(status, page), [status, page]));
}

/** One crop cycle with its calendar and season cost. */
export function useCropCycle(cycleId: string) {
  return useResource(useCallback(() => apiClient.cycles.get(cycleId), [cycleId]));
}

/** A crop cycle's activities, newest first, with the season total in meta. */
export function useActivities(cycleId: string, page: number) {
  return useResource(useCallback(() => apiClient.activities.list(cycleId, page), [cycleId, page]));
}

/** The whole-farm calendar between two dates (inclusive, at most 180 days apart). */
export function useFarmCalendarRange(from: string, to: string) {
  return useResource(useCallback(() => apiClient.calendar.get(from, to), [from, to]));
}

/** One of the farmer's own calendar events. */
export function useFarmEvent(eventId: string | undefined) {
  return useResource(useCallback(() => (eventId ? apiClient.events.get(eventId) : Promise.resolve(null)), [eventId]));
}

/** The whole-farm calendar for the default window (14 days back, 60 ahead). */
export function useFarmCalendar() {
  return useResource(useCallback(() => apiClient.calendar.get(), []));
}

/** Every open crop cycle (planned or active), for plot rows and Home. */
export function useOpenCycles() {
  return useResource(useCallback(() => apiClient.cycles.list('open', 1, 100), []));
}
