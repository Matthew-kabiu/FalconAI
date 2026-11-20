// Kiswahili text for the auth screens. FIRST DRAFT: pending translation review.
import type { authEn } from './auth.en';

export const authSw: Record<keyof typeof authEn, string> = {
  // Shared shell and brand panel
  'auth.panel.title': 'Kumbukumbu za shamba lako, mfukoni mwako.',
  'auth.panel.body': 'Mashamba, mazao, shughuli na gharama mahali pamoja, kwa Kiingereza au Kiswahili.',
  'auth.tabs.label': 'Ingia au fungua akaunti',
  'auth.or': 'au',
  'auth.google.continue': 'Endelea na Google',

  // Fields
  'auth.field.firstName': 'Jina la kwanza',
  'auth.field.lastName': 'Jina la mwisho',
  'auth.field.email': 'Barua pepe',
  'auth.field.password': 'Nenosiri',
  'auth.field.passwordHint': 'Tumia angalau herufi 8. Sentensi fupi unayoweza kukumbuka inafaa.',
  'auth.field.newPassword': 'Nenosiri jipya',
  'auth.field.confirmPassword': 'Andika nenosiri jipya tena',
  'auth.field.code': 'Namba ya tarakimu 6',
  'auth.field.codeHint': 'Tarakimu 6 tulizotuma kwa barua pepe yako.',
  'auth.password.show': 'Onyesha nenosiri',
  'auth.password.hide': 'Ficha nenosiri',

  // Sign in
  'auth.signIn.heading': 'Karibu tena',
  'auth.signIn.lead': 'Ingia ili uone mashamba na mazao yako.',
  'auth.signIn.forgot': 'Umesahau nenosiri?',

  // Sign in on a new device
  'auth.trust.title': 'Thibitisha kuwa ni wewe',
  'auth.trust.lead':
    'Unaingia kwa kifaa kipya, kwa hivyo tumetuma namba ya tarakimu 6 kwa barua pepe yako. Iandike ili umalize kuingia.',
  'auth.trust.submit': 'Thibitisha na uingie',

  // A step these screens cannot do yet
  'auth.unsupported.title': 'Hatua moja zaidi inahitajika',
  'auth.unsupported.body':
    'Akaunti yako inahitaji hatua ya ziada ya kuingia ambayo skrini hii haiwezi kufanya bado. Jaribu Endelea na Google, au uliza timu ya Falcon AI msaada.',
  'auth.startOver': 'Anza tena',

  // Sign up
  'auth.signUp.lead': 'Weka kumbukumbu za shamba lako mahali pamoja. Inachukua kama dakika moja.',
  'auth.signUp.submit': 'Fungua akaunti',

  // Verify email
  'auth.verify.title': 'Angalia barua pepe yako',
  'auth.verify.lead': 'Tumetuma namba ya tarakimu 6 kwa {email}. Iandike ili umalize kufungua akaunti yako.',
  'auth.verify.leadNoEmail': 'Tumetuma namba ya tarakimu 6 kwa barua pepe yako. Iandike ili umalize kufungua akaunti yako.',
  'auth.verify.submit': 'Thibitisha barua pepe',
  'auth.verify.differentEmail': 'Tumia barua pepe nyingine',
  'auth.verify.moreNeeded':
    'Barua pepe yako imethibitishwa, lakini akaunti yako inahitaji maelezo zaidi ambayo skrini hii haiwezi kuchukua bado. Tafadhali uliza timu ya Falcon AI msaada.',

  // Codes
  'auth.code.resend': 'Tuma namba mpya',
  'auth.code.resendIn': 'Tuma namba mpya baada ya sekunde {seconds}',
  'auth.code.resent': 'Namba mpya inakuja. Angalia barua pepe yako.',

  // Forgot password
  'auth.forgot.title': 'Badilisha nenosiri lako',
  'auth.forgot.lead': 'Andika barua pepe unayotumia kwa Falcon AI. Tutakutumia namba ili uweke nenosiri jipya.',
  'auth.forgot.submit': 'Tuma namba',
  'auth.forgot.backToSignIn': 'Rudi kwenye kuingia',

  // Reset password
  'auth.reset.title': 'Weka nenosiri jipya',
  'auth.reset.lead': 'Andika namba kutoka kwa barua pepe yako, kisha chagua nenosiri jipya.',
  'auth.reset.notice':
    'Ikiwa kuna akaunti ya Falcon AI ya {email}, tumeitumia namba ya tarakimu 6. Inaweza kuchukua dakika moja kufika.',
  'auth.reset.noticeNoEmail':
    'Ikiwa kuna akaunti ya Falcon AI ya barua pepe hiyo, tumeitumia namba ya tarakimu 6. Inaweza kuchukua dakika moja kufika.',
  'auth.reset.submit': 'Hifadhi nenosiri jipya',
  'auth.reset.resent': 'Ikiwa akaunti ipo, namba mpya inakuja.',
  'auth.reset.success': 'Nenosiri lako limebadilishwa. Umeingia.',

  // Returning from Google
  'auth.sso.title': 'Tunakuingiza',
  'auth.sso.lead': 'Tunamaliza kuingia kwa Google. Subiri kidogo.',

  // Checks before anything is sent
  'auth.validation.firstName': 'Andika jina lako la kwanza, kwa mfano Wanjiku.',
  'auth.validation.lastName': 'Andika jina lako la mwisho, kwa mfano Otieno.',
  'auth.validation.email': 'Andika barua pepe yako, kwa mfano wanjiku@example.com.',
  'auth.validation.password': 'Andika nenosiri lako.',
  'auth.validation.passwordShort': 'Tumia angalau herufi 8.',
  'auth.validation.passwordMismatch': 'Manenosiri mawili hayafanani. Andika nenosiri lile lile katika visanduku vyote viwili.',
  'auth.validation.code': 'Andika namba ya tarakimu 6 kutoka kwa barua pepe yako, kwa mfano 123456.',

  // Friendly versions of sign-in service errors
  'auth.error.invalidCredentials': 'Barua pepe au nenosiri si sahihi. Kagua vyote viwili kisha ujaribu tena.',
  'auth.error.emailInUse': 'Tayari kuna akaunti yenye barua pepe hii. Ingia badala yake.',
  'auth.error.emailInvalid': 'Barua pepe hiyo haionekani kuwa sahihi. Ikague kisha ujaribu tena.',
  'auth.error.passwordWeak': 'Nenosiri hilo ni rahisi kukisia. Tumia refu zaidi, kama sentensi fupi.',
  'auth.error.passwordBreached': 'Nenosiri hilo limewahi kuvuja mtandaoni, kwa hivyo si salama. Tafadhali chagua lingine.',
  'auth.error.passwordCompromised': 'Nenosiri hili si salama tena. Chagua Umesahau nenosiri ili uweke jipya.',
  'auth.error.codeIncorrect': 'Namba hiyo si sahihi. Angalia barua pepe yako kisha ujaribu tena.',
  'auth.error.codeExpired': 'Namba hiyo imeisha muda. Omba namba mpya kisha ujaribu tena.',
  'auth.error.tooManyAttempts': 'Umejaribu mara nyingi. Tafadhali subiri dakika chache kisha ujaribu tena.',
  'auth.error.locked': 'Akaunti hii imefungwa kwa sasa baada ya majaribio mengi. Tafadhali jaribu tena baadaye.',
  'auth.error.captcha': 'Hatukuweza kuthibitisha kuwa wewe ni mtu. Fungua ukurasa upya kisha ujaribu tena.',
  'auth.error.google': 'Hatukuweza kukuingiza kwa Google. Tafadhali jaribu tena.',
  'auth.error.notAllowed': 'Kufungua akaunti hakujafunguliwa kwa barua pepe hii kwa sasa.',

  // Live validation, notifications and password strength
  'auth.field.valid': 'Iko sawa',
  'auth.validation.fixFields': 'Baadhi ya taarifa zinahitaji kurekebishwa. Kagua sehemu zilizowekwa alama.',
  'auth.notify.codeSent': 'Tumetuma namba ya siri kwenye barua pepe yako.',
  'auth.strength.label': 'Nguvu ya nenosiri',
  'auth.strength.tooShort': 'Fupi mno',
  'auth.strength.weak': 'Dhaifu',
  'auth.strength.fair': 'Wastani',
  'auth.strength.good': 'Nzuri',
  'auth.strength.strong': 'Imara',
  'auth.strength.tip.length': 'Liongeze urefu. Maneno matatu au manne yanafaa',
  'auth.strength.tip.variety': 'Ongeza neno jingine, namba au alama',
  'auth.strength.tip.common': 'Epuka maneno ya kawaida na mfuatano kama 1234',
  'auth.strength.tip.ok': 'Hili ni nenosiri imara',
  'auth.sso.stalledTitle': 'Kuingia kwa Google hakukukamilika',
  'auth.sso.stalled':
    'Hii inachukua muda mrefu mno, kwa hivyo tumeacha kusubiri. Rudi ujaribu tena, au ingia kwa barua pepe na nenosiri lako.',
  'auth.sso.back': 'Rudi kwenye kuingia',
};
