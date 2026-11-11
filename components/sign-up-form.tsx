"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile";
import { validateEmail, validateNewPassword, validatePasswordConfirmation, validateUsername, PASSWORD_MAX, USERNAME_MAX, EMAIL_MAX } from "@/lib/validation";

const signupErrors: Record<string, string> = {
  username_taken: "That username is already in use. Choose another one.",
  invalid_request: "Use a valid email, a username with at least 2 characters, and a password with 8 to 72 characters.",
  captcha_failed: "We could not verify that you are human. Please try the check again.",
  signup_failed: "We could not create the account. Check your details and try again.",
};

type FieldName = "email" | "username" | "password" | "confirmation";

// Edge Function errors arrive as an HTTP error whose body is {"error": "<code>"}.
async function readErrorCode(error: unknown): Promise<string | null> {
  const context = error && typeof error === "object" && "context" in error ? (error as { context?: unknown }).context : null;
  if (!(context instanceof Response)) return null;
  if (context.status === 404) return "not_available";
  try {
    const body = await context.clone().json();
    return typeof body?.error === "string" ? body.error : null;
  } catch {
    return null;
  }
}

export function SignUpForm({ destination = "/" }: { destination?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const errors: Record<FieldName, string> = {
    email: validateEmail(email),
    username: validateUsername(username),
    password: validateNewPassword(password),
    confirmation: validatePasswordConfirmation(password, confirmation),
  };
  const shown = (field: FieldName) => (touched[field] || submitAttempted ? errors[field] : "");
  const touch = (field: FieldName) => () => setTouched((current) => ({ ...current, [field]: true }));
  const passwordReady = password.length > 0 && !errors.password;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const honeypot = String(new FormData(form).get("website") ?? "");

    setError("");
    setSubmitAttempted(true);
    const firstInvalid = (["email", "username", "password", "confirmation"] as FieldName[]).find((field) => errors[field]);
    if (firstInvalid) {
      (form.elements.namedItem(firstInvalid) as HTMLElement | null)?.focus();
      return;
    }
    if (TURNSTILE_SITE_KEY && !captchaToken) {
      setError("Please complete the human verification below, then try again.");
      return;
    }

    setSubmitting(true);
    const { data, error: signupError } = await supabase.functions.invoke<{ status: string }>("sign-up", {
      body: { email: email.trim(), username: username.trim(), password, website: honeypot, captchaToken },
    });

    if (signupError || data?.status !== "pending") {
      const code = (await readErrorCode(signupError)) ?? "signup_failed";
      setError(code === "not_available"
        ? "Account creation is not available yet. Ask the administrator to finish the library setup."
        : signupErrors[code] ?? signupErrors.signup_failed);
      setSubmitting(false);
      // A Turnstile token works once, so ask for a fresh one before the next attempt.
      setCaptchaReset((current) => current + 1);
      return;
    }

    router.replace(`/sign-in?created=1&next=${encodeURIComponent(destination)}`);
  }

  return (
    <form className="signup-form" onSubmit={submit} noValidate>
      <div className="signup-form-intro"><span className="form-step">01</span><div><strong>Set up your access</strong><p>Use an email you check regularly for account updates.</p></div></div>
      <div className="field-grid single-column">
        <label className="signup-field">Email address<input name="email" type="email" required maxLength={EMAIL_MAX} autoComplete="email" disabled={submitting} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} onBlur={touch("email")} aria-invalid={Boolean(shown("email"))} aria-describedby="email-feedback" />{shown("email") && <span id="email-feedback" className="field-feedback invalid">{shown("email")}</span>}</label>
        <label className="signup-field">Username<input name="username" maxLength={USERNAME_MAX} required autoComplete="username" disabled={submitting} placeholder="How you’ll appear in the library" value={username} onChange={(event) => setUsername(event.target.value)} onBlur={touch("username")} aria-invalid={Boolean(shown("username"))} aria-describedby="username-feedback" />{shown("username") && <span id="username-feedback" className="field-feedback invalid">{shown("username")}</span>}</label>
        <label className="signup-field">Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} maxLength={PASSWORD_MAX} required autoComplete="new-password" disabled={submitting} value={password} onChange={(event) => setPassword(event.target.value)} onBlur={touch("password")} placeholder="At least 8 characters" aria-invalid={Boolean(shown("password"))} aria-describedby="password-feedback" /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div><span id="password-feedback" className={`field-feedback ${shown("password") ? "invalid" : passwordReady ? "valid" : ""}`}>{shown("password") || (passwordReady ? "Password length looks good" : "Use at least 8 characters")}</span></label>
        <label className="signup-field">Confirm password<div className="password-input"><input name="confirmation" type={showPassword ? "text" : "password"} maxLength={PASSWORD_MAX} required autoComplete="new-password" disabled={submitting} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} onBlur={touch("confirmation")} placeholder="Repeat your password" aria-invalid={Boolean(shown("confirmation")) || (confirmation.length > 0 && !passwordsMatch)} aria-describedby="confirmation-feedback" /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div>{(confirmation.length > 0 || shown("confirmation")) && <span id="confirmation-feedback" className={`field-feedback ${passwordsMatch ? "valid" : "invalid"}`}>{passwordsMatch ? "Passwords match" : errors.confirmation}</span>}</label>
      </div>
      {/* Honeypot: invisible to people, tempting to bots. Anything typed here is silently discarded server-side. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <Turnstile onToken={setCaptchaToken} resetSignal={captchaReset} />
      {error && <p className="notice error" role="alert">{error}</p>}
      <p className="security-note"><span aria-hidden="true">▣</span> Your information is used only to manage your protected library access.</p>
      <button className="button signup-submit" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" />Creating account...</> : "Create account"}</button>
      <p className="signin-prompt">Already have an account? <a href={`/sign-in?next=${encodeURIComponent(destination)}`}>Sign in</a></p>
    </form>
  );
}
