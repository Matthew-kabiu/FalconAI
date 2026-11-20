// src/lib/routes.ts — the ONLY place URL and page path strings live (Vite-Build-Template §4).
import { env } from '@/lib/config/env';

const API_V1 = `${env.VITE_API_BASE_URL}/v1`;

/** Backend API routes — mirror the backend router (`/api/health` is unversioned). */
export const API_ROUTES = {
  health: `${env.VITE_API_BASE_URL}/health`,
  /** The signed-in user as falcon-api sees them (Clerk user id + role). Needs the Bearer token. */
  me: `${API_V1}/me`,
  /** Farms and plots (api/openapi.yaml). Owner-only: someone else's id is a 404. */
  farms: `${API_V1}/farms`,
  farm: (farmId: string) => `${API_V1}/farms/${encodeURIComponent(farmId)}`,
  farmPlots: (farmId: string) => `${API_V1}/farms/${encodeURIComponent(farmId)}/plots`,
  plot: (plotId: string) => `${API_V1}/plots/${encodeURIComponent(plotId)}`,
  /** Crops, crop cycles and activities (api/openapi.yaml). Owner-only. */
  crops: `${API_V1}/crops`,
  cropCycles: `${API_V1}/crop-cycles`,
  plotCropCycles: (plotId: string) => `${API_V1}/plots/${encodeURIComponent(plotId)}/crop-cycles`,
  cropCycle: (cycleId: string) => `${API_V1}/crop-cycles/${encodeURIComponent(cycleId)}`,
  cycleActivities: (cycleId: string) => `${API_V1}/crop-cycles/${encodeURIComponent(cycleId)}/activities`,
  activity: (activityId: string) => `${API_V1}/activities/${encodeURIComponent(activityId)}`,
  /** One calendar for the whole farm: every open crop's stages and tasks plus logged activities. */
  calendar: `${API_V1}/calendar`,
  events: `${API_V1}/events`,
  event: (eventId: string) => `${API_V1}/events/${encodeURIComponent(eventId)}`,
} as const;

/** SPA page routes — used by the router table AND all navigation. */
export const PAGE_ROUTES = {
  /** Public site: home, features, crop health, pilot. */
  start: '/',
  features: '/features',
  cropHealth: '/crop-health',
  pilot: '/pilot',
  /** Legal documents. Privacy preferences live inside the cookie notice, not on a page. */
  legal: {
    privacy: '/privacy',
    terms: '/terms',
  },
  /** Connection check (API and database health). */
  status: '/status',
  /** Our own auth screens, driven by Clerk's hooks. Sign in and sign up are two tabs of one screen. */
  auth: {
    signIn: '/sign-in',
    signUp: '/sign-up',
    /** Type the emailed code that finishes a sign-up. */
    verifyEmail: '/sign-up/verify-email',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    /** Where Google sends the browser back after "Continue with Google". */
    ssoCallback: '/sso-callback',
  },
  /** Signed-in pages. */
  app: {
    home: '/home',
    farms: '/farms',
    farmNew: '/farms/new',
    farm: (farmId: string) => `/farms/${encodeURIComponent(farmId)}`,
    farmEdit: (farmId: string) => `/farms/${encodeURIComponent(farmId)}/edit`,
    plotNew: (farmId: string) => `/farms/${encodeURIComponent(farmId)}/plots/new`,
    plotEdit: (farmId: string, plotId: string) =>
      `/farms/${encodeURIComponent(farmId)}/plots/${encodeURIComponent(plotId)}/edit`,
    /** Start a crop on a plot. */
    cropNew: (farmId: string, plotId: string) =>
      `/farms/${encodeURIComponent(farmId)}/plots/${encodeURIComponent(plotId)}/crops/new`,
    crop: (cycleId: string) => `/crops/${encodeURIComponent(cycleId)}`,
    cropEdit: (cycleId: string) => `/crops/${encodeURIComponent(cycleId)}/edit`,
    activityNew: (cycleId: string) => `/crops/${encodeURIComponent(cycleId)}/activities/new`,
    activityEdit: (cycleId: string, activityId: string) =>
      `/crops/${encodeURIComponent(cycleId)}/activities/${encodeURIComponent(activityId)}/edit`,
    /** Router-table patterns for the paths above. */
    patterns: {
      cropNew: '/farms/:farmId/plots/:plotId/crops/new',
      crop: '/crops/:cycleId',
      cropEdit: '/crops/:cycleId/edit',
      activityNew: '/crops/:cycleId/activities/new',
      activityEdit: '/crops/:cycleId/activities/:activityId/edit',
      farm: '/farms/:farmId',
      farmEdit: '/farms/:farmId/edit',
      plotNew: '/farms/:farmId/plots/new',
      plotEdit: '/farms/:farmId/plots/:plotId/edit',
      eventNew: '/calendar/events/new',
      eventEdit: '/calendar/events/:eventId/edit',
    },
    crops: '/crops',
    cropAdd: '/crops/new',
    calendar: '/calendar',
    eventNew: (date?: string) => (date ? `/calendar/events/new?date=${date}` : '/calendar/events/new'),
    eventEdit: (eventId: string) => `/calendar/events/${encodeURIComponent(eventId)}/edit`,
    account: '/account',
  },
  notFound: '*',
} as const;

export const ROUTES = { api: API_ROUTES, pages: PAGE_ROUTES } as const;
