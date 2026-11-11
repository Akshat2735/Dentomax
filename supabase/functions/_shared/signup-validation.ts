// Server-side copy of the rules in lib/validation.ts. Keep the two identical;
// tests/validation.test.mjs checks both against the same cases.
// Return value: true when the input is acceptable.

export const EMAIL_MAX = 254;
export const USERNAME_MIN = 2;
export const USERNAME_MAX = 100;
export const PASSWORD_MIN = 8;
// bcrypt, which Supabase Auth uses, ignores everything after 72 bytes.
export const PASSWORD_MAX = 72;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return email.length > 0 && email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

export function isValidUsername(value: string): boolean {
  const username = value.trim();
  return username.length >= USERNAME_MIN && username.length <= USERNAME_MAX && !CONTROL_CHARACTERS.test(username);
}

export function isValidNewPassword(value: string): boolean {
  return value.length >= PASSWORD_MIN && new TextEncoder().encode(value).length <= PASSWORD_MAX;
}

type TurnstileResult = { success: boolean; "error-codes"?: string[] };

// Verifies a Cloudflare Turnstile token. Returns true only when Cloudflare confirms it.
export async function verifyTurnstile(secret: string, token: string, remoteIp: string | null): Promise<boolean> {
  if (!token || token.length > 2048) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const result = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!result.ok) return false;
    const data = (await result.json()) as TurnstileResult;
    return data.success === true;
  } catch {
    // If Cloudflare is unreachable the request is rejected, never waved through.
    return false;
  }
}
