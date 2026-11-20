// Hands Clerk's getToken to the apiClient singleton, so every API call carries
// `Authorization: Bearer <Clerk session token>` (SOP addendum, Vite §9).
// Must render inside <ClerkProvider>. Renders nothing.
import { useEffect } from 'react';
import { useAuth } from '@clerk/react';
import { apiClient } from '@/lib/api/apiClient';

export function ApiAuthBridge() {
  const { getToken } = useAuth();

  useEffect(() => {
    apiClient.setTokenGetter(() => getToken());
    return () => apiClient.setTokenGetter(null);
  }, [getToken]);

  return null;
}
