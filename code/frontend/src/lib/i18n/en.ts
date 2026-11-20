// src/lib/i18n/en.ts — English dictionary, the reference language (TaskLabs #288).
// Project-owned and typed; no i18n library (SOP addendum, Vite contract §12).
// Every key here must also exist in sw.ts, or `tsc` fails.

import { appEn } from './app.en';
import { authEn } from './auth.en';
import { legalEn } from './legal.en';
import { siteEn } from './site.en';

export const en = {
  ...siteEn,
  ...authEn,
  ...appEn,
  ...legalEn,
  // App
  'app.name': 'Falcon AI',
  'app.tagline': 'Farm management for small-scale farmers.',

  // Language switch
  'language.label': 'Language',

  // Theme
  'theme.label': 'Theme',
  'theme.system': 'System',
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  // Shared
  'common.loading': 'Loading…',
  'common.tryAgain': 'Try again',
  'common.reload': 'Reload page',
  'common.close': 'Close',
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.optional': 'optional',

  // Start page
  'start.checking': 'Checking connection…',
  'start.connected': 'Connected',
  'start.api': 'API',
  'start.database': 'Database',
  'start.statusOk': 'Working',
  'start.statusDown': 'Not working',
  'start.checkAgain': 'Check again',
  'start.accountNav': 'Your account',

  // Sign-in / sign-up (Clerk widgets; these label the pages and links around them)
  'auth.signIn.title': 'Sign in',
  'auth.signIn.toSignUp': 'Create an account',
  'auth.signUp.title': 'Create your account',
  'auth.session.checking': 'Checking your account…',

  // Roles (from falcon-api GET /v1/me)
  'role.member': 'Member',
  'role.admin': 'Admin',

  // Home (signed in; placeholder until the real home page)
  'home.greeting': 'Hello,',
  'home.greetingNoName': 'Hello!',
  'home.body': 'Your farms, crops and activities will show here soon.',
  'home.role': 'Your role',

  // Not-found page
  'notFound.title': 'Page not found',
  'notFound.body': 'The page you are looking for does not exist.',
  'notFound.back': 'Back to start',

  // Friendly error page
  'errorPage.title': 'Something went wrong',
  'errorPage.body': 'This is not your fault. Please try again, or go back to the start page.',
  'errorPage.goHome': 'Go home',

  // Toasts
  'toast.regionLabel': 'Notifications',
  'toast.close': 'Close notification',

  // Friendly API error messages (errorMap)
  'error.validation': 'Some details look wrong. Please check and try again.',
  'error.unauthorized': 'Please sign in to continue.',
  'error.forbidden': "You don't have access to this.",
  'error.notFound': "We couldn't find what you were looking for.",
  'error.conflict': 'This already exists or was changed. Please refresh and try again.',
  'error.rateLimited': 'Too many attempts. Please wait a moment and try again.',
  'error.internal': 'Something went wrong on our side. Please try again.',
  'error.network': "Can't reach Falcon AI right now. Check your connection and try again.",
  'error.unavailable': 'Falcon AI is not ready right now. Please try again in a moment.',
  'error.generic': 'Something went wrong. Please try again.',
} satisfies Record<string, string>;

/** Every dictionary key. `t()` only accepts these. */
export type MessageKey = keyof typeof en;

/** Shape every language must match exactly: same keys, string values. */
export type Dictionary = Record<MessageKey, string>;
