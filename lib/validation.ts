// Form validation rules shared by every form in the browser.
// The sign-up Edge Function keeps an identical copy in
// supabase/functions/_shared/signup-validation.ts (different runtime, cannot import
// from here). tests/validation.test.mjs runs the same cases against both copies
// so they cannot drift apart. Return value: an error message, or "" when valid.

export const EMAIL_MAX = 254;
export const USERNAME_MIN = 2;
export const USERNAME_MAX = 100;
export const PASSWORD_MIN = 8;
// bcrypt, which Supabase Auth uses, ignores everything after 72 bytes.
export const PASSWORD_MAX = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function validateEmail(value: string): string {
  const email = value.trim();
  if (!email) return "Enter your email address.";
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) return "Enter a valid email address, like you@example.com.";
  return "";
}

export function validateUsername(value: string): string {
  const username = value.trim();
  if (!username) return "Choose a username.";
  if (username.length < USERNAME_MIN) return `Use at least ${USERNAME_MIN} characters.`;
  if (username.length > USERNAME_MAX) return `Use no more than ${USERNAME_MAX} characters.`;
  if (CONTROL_CHARACTERS.test(username)) return "Remove special control characters from the username.";
  return "";
}

export function validateNewPassword(value: string): string {
  if (!value) return "Enter a password.";
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(value).length > PASSWORD_MAX) return `Use no more than ${PASSWORD_MAX} characters.`;
  return "";
}

export function validatePasswordConfirmation(password: string, confirmation: string): string {
  if (!confirmation) return "Repeat your password.";
  if (password !== confirmation) return "The passwords do not match.";
  return "";
}
