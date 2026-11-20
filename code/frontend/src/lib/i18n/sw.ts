// src/lib/i18n/sw.ts — Kiswahili dictionary (TaskLabs #288).
// FIRST DRAFT: this text is pending the month-3 translation review. Keep it simple,
// everyday Kiswahili that farmers use; do not treat it as final copy.
// Typed as `Dictionary` (derived from en.ts): a missing or extra key fails `tsc`.
import type { Dictionary } from './en';
import { appSw } from './app.sw';
import { authSw } from './auth.sw';
import { legalSw } from './legal.sw';
import { siteSw } from './site.sw';

export const sw: Dictionary = {
  ...siteSw,
  ...authSw,
  ...appSw,
  ...legalSw,
  // App
  'app.name': 'Falcon AI',
  'app.tagline': 'Usimamizi wa shamba kwa wakulima wadogo.',

  // Language switch
  'language.label': 'Lugha',

  // Theme
  'theme.label': 'Mwonekano',
  'theme.system': 'Mfumo',
  'theme.light': 'Mwanga',
  'theme.dark': 'Giza',

  // Shared
  'common.loading': 'Inapakia…',
  'common.tryAgain': 'Jaribu tena',
  'common.reload': 'Pakia ukurasa upya',
  'common.close': 'Funga',
  'common.save': 'Hifadhi',
  'common.cancel': 'Ghairi',
  'common.delete': 'Futa',
  'common.optional': 'si lazima',

  // Start page
  'start.checking': 'Inakagua muunganisho…',
  'start.connected': 'Imeunganishwa',
  'start.api': 'API',
  'start.database': 'Hifadhidata',
  'start.statusOk': 'Inafanya kazi',
  'start.statusDown': 'Haifanyi kazi',
  'start.checkAgain': 'Kagua tena',
  'start.accountNav': 'Akaunti yako',

  // Sign-in / sign-up (Clerk widgets; these label the pages and links around them)
  'auth.signIn.title': 'Ingia',
  'auth.signIn.toSignUp': 'Fungua akaunti',
  'auth.signUp.title': 'Fungua akaunti yako',
  'auth.session.checking': 'Inakagua akaunti yako…',

  // Roles (from falcon-api GET /v1/me)
  'role.member': 'Mwanachama',
  'role.admin': 'Msimamizi',

  // Home (signed in; placeholder until the real home page)
  'home.greeting': 'Habari,',
  'home.greetingNoName': 'Habari!',
  'home.body': 'Mashamba, mazao na shughuli zako zitaonekana hapa hivi karibuni.',
  'home.role': 'Jukumu lako',

  // Not-found page
  'notFound.title': 'Ukurasa haupatikani',
  'notFound.body': 'Ukurasa unaoutafuta haupo.',
  'notFound.back': 'Rudi mwanzo',

  // Friendly error page
  'errorPage.title': 'Kuna tatizo limetokea',
  'errorPage.body': 'Hili si kosa lako. Tafadhali jaribu tena, au urudi kwenye ukurasa wa mwanzo.',
  'errorPage.goHome': 'Rudi mwanzo',

  // Toasts
  'toast.regionLabel': 'Arifa',
  'toast.close': 'Funga arifa',

  // Friendly API error messages (errorMap)
  'error.validation': 'Baadhi ya taarifa si sahihi. Tafadhali kagua kisha ujaribu tena.',
  'error.unauthorized': 'Tafadhali ingia ili uendelee.',
  'error.forbidden': 'Huna ruhusa ya kufungua hiki.',
  'error.notFound': 'Hatukupata ulichokuwa unatafuta.',
  'error.conflict': 'Hiki tayari kipo au kimebadilishwa. Tafadhali pakia ukurasa upya kisha ujaribu tena.',
  'error.rateLimited': 'Umejaribu mara nyingi mno. Tafadhali subiri kidogo kisha ujaribu tena.',
  'error.internal': 'Kuna tatizo upande wetu. Tafadhali jaribu tena.',
  'error.network': 'Hatuwezi kufikia Falcon AI kwa sasa. Kagua mtandao wako kisha ujaribu tena.',
  'error.unavailable': 'Falcon AI haiko tayari kwa sasa. Tafadhali jaribu tena baada ya muda mfupi.',
  'error.generic': 'Kuna tatizo limetokea. Tafadhali jaribu tena.',
};
