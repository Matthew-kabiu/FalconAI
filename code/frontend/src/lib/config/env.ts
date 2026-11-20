// src/lib/config/env.ts — fail fast at module load (Vite-Build-Template §10.2)
import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_APP_NAME: z.string().min(1),
  VITE_ENVIRONMENT: z.enum(['development', 'production']).default('development'),
  // Clerk publishable key — public by design (it ships in the bundle). The secret key never comes here.
  VITE_CLERK_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}
export const env = parsed.data;
