// English text for the custom sign-in, sign-up, email verification and password
// reset screens. Spread into en.ts.
// `{email}` and `{seconds}` are filled in by the screens (see components/auth/auth-text.ts).
export const authEn = {
  // Shared shell and brand panel
  'auth.panel.title': 'Your farm records, in your pocket.',
  'auth.panel.body': 'Plots, crops, activities and costs in one place, in English or Kiswahili.',
  'auth.tabs.label': 'Sign in or create an account',
  'auth.or': 'or',
  'auth.google.continue': 'Continue with Google',

  // Fields
  'auth.field.firstName': 'First name',
  'auth.field.lastName': 'Last name',
  'auth.field.email': 'Email address',
  'auth.field.password': 'Password',
  'auth.field.passwordHint': 'Use at least 8 characters. A short sentence you can remember works well.',
  'auth.field.newPassword': 'New password',
  'auth.field.confirmPassword': 'Type the new password again',
  'auth.field.code': '6-digit code',
  'auth.field.codeHint': 'The 6 numbers we sent to your email.',
  'auth.password.show': 'Show password',
  'auth.password.hide': 'Hide password',

  // Sign in
  'auth.signIn.heading': 'Welcome back',
  'auth.signIn.lead': 'Sign in to see your farms and crops.',
  'auth.signIn.forgot': 'Forgot password?',

  // Sign in on a new device (Clerk asks for an emailed code)
  'auth.trust.title': 'Confirm it is you',
  'auth.trust.lead': 'You are signing in on a new device, so we sent a 6-digit code to your email. Enter it to finish signing in.',
  'auth.trust.submit': 'Confirm and sign in',

  // A step these screens cannot do yet (authenticator app, extra account tasks)
  'auth.unsupported.title': 'One more step is needed',
  'auth.unsupported.body':
    'Your account needs an extra sign-in step that this screen cannot do yet. Try Continue with Google, or ask the Falcon AI team for help.',
  'auth.startOver': 'Start again',

  // Sign up
  'auth.signUp.lead': 'Keep your farm records in one place. It takes about a minute.',
  'auth.signUp.submit': 'Create account',

  // Verify email
  'auth.verify.title': 'Check your email',
  'auth.verify.lead': 'We sent a 6-digit code to {email}. Enter it to finish creating your account.',
  'auth.verify.leadNoEmail': 'We sent a 6-digit code to your email. Enter it to finish creating your account.',
  'auth.verify.submit': 'Verify email',
  'auth.verify.differentEmail': 'Use a different email',
  'auth.verify.moreNeeded':
    'Your email is confirmed, but your account needs more details that this screen cannot collect yet. Please ask the Falcon AI team for help.',

  // Codes
  'auth.code.resend': 'Send a new code',
  'auth.code.resendIn': 'Send a new code in {seconds} seconds',
  'auth.code.resent': 'A new code is on its way. Check your email.',

  // Forgot password
  'auth.forgot.title': 'Reset your password',
  'auth.forgot.lead': 'Enter the email you use for Falcon AI. We will send a code so you can set a new password.',
  'auth.forgot.submit': 'Send reset code',
  'auth.forgot.backToSignIn': 'Back to sign in',

  // Reset password
  'auth.reset.title': 'Set a new password',
  'auth.reset.lead': 'Enter the code from your email, then choose a new password.',
  'auth.reset.notice':
    'If there is a Falcon AI account for {email}, we have sent it a 6-digit code. It can take a minute to arrive.',
  'auth.reset.noticeNoEmail':
    'If there is a Falcon AI account for that email, we have sent it a 6-digit code. It can take a minute to arrive.',
  'auth.reset.submit': 'Save new password',
  'auth.reset.resent': 'If the account exists, a new code is on its way.',
  'auth.reset.success': 'Your password was changed. You are signed in.',

  // Returning from Google
  'auth.sso.title': 'Signing you in',
  'auth.sso.lead': 'Finishing sign-in with Google. This takes a moment.',

  // Checks before anything is sent
  'auth.validation.firstName': 'Enter your first name, for example Wanjiku.',
  'auth.validation.lastName': 'Enter your last name, for example Otieno.',
  'auth.validation.email': 'Enter your email address, for example wanjiku@example.com.',
  'auth.validation.password': 'Enter your password.',
  'auth.validation.passwordShort': 'Use at least 8 characters.',
  'auth.validation.passwordMismatch': 'The two passwords are not the same. Type the same password in both boxes.',
  'auth.validation.code': 'Enter the 6-digit code from your email, for example 123456.',

  // Friendly versions of sign-in service errors
  'auth.error.invalidCredentials': 'That email or password is not right. Check both and try again.',
  'auth.error.emailInUse': 'There is already an account with this email. Sign in instead.',
  'auth.error.emailInvalid': 'That email address does not look right. Check it and try again.',
  'auth.error.passwordWeak': 'That password is too easy to guess. Use a longer one, such as a short sentence.',
  'auth.error.passwordBreached': 'That password has appeared in a data leak, so it is not safe. Please choose a different one.',
  'auth.error.passwordCompromised': 'This password is no longer safe to use. Choose Forgot password to set a new one.',
  'auth.error.codeIncorrect': 'That code is not right. Check your email and try again.',
  'auth.error.codeExpired': 'That code has expired. Ask for a new code and try again.',
  'auth.error.tooManyAttempts': 'Too many attempts. Please wait a few minutes and try again.',
  'auth.error.locked': 'This account is locked for now after too many attempts. Please try again later.',
  'auth.error.captcha': 'We could not confirm that you are a person. Refresh the page and try again.',
  'auth.error.google': 'We could not sign you in with Google. Please try again.',
  'auth.error.notAllowed': 'Sign-up is not open for this email right now.',

  // Live validation, notifications and password strength
  'auth.field.valid': 'Looks good',
  'auth.validation.fixFields': 'Some details need fixing. Check the marked fields.',
  'auth.notify.codeSent': 'We sent a code to your email.',
  'auth.strength.label': 'Password strength',
  'auth.strength.tooShort': 'Too short',
  'auth.strength.weak': 'Weak',
  'auth.strength.fair': 'Fair',
  'auth.strength.good': 'Good',
  'auth.strength.strong': 'Strong',
  'auth.strength.tip.length': 'Make it longer. Three or four words work well',
  'auth.strength.tip.variety': 'Add another word, a number or a symbol',
  'auth.strength.tip.common': 'Avoid common words and runs like 1234',
  'auth.strength.tip.ok': 'This is a solid password',
  'auth.sso.stalledTitle': 'Google sign-in did not finish',
  'auth.sso.stalled':
    'This is taking too long, so we stopped waiting. Go back and try again, or sign in with your email and password.',
  'auth.sso.back': 'Back to sign in',
} satisfies Record<string, string>;
