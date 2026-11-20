// The device privacy choice and whether the cookie notice should be on screen.
import { useSyncExternalStore } from 'react';
import { getPrivacy, subscribePrivacy } from '@/lib/privacy';

export function usePrivacy() {
  return useSyncExternalStore(subscribePrivacy, getPrivacy);
}
