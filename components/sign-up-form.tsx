"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

const signupErrors: Record<string, string> = {
  username_taken: "That username is already in use. Choose another one.",
  invalid_request: "Use a valid email, a username with at least 2 characters, and a password with at least 8 characters.",
  signup_failed: "We could not create the account. Check your details and try again.",
};

function signupErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response && context.status === 404) {
      return "Account creation is not available yet. Ask the administrator to finish the library setup.";
    }
  }
  return signupErrors.signup_failed;
}

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const passwordReady = password.length >= 8;
  const passwordsMatch = confirmation.length > 0 && password === confirmation;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    const submittedPassword = String(formData.get("password") ?? "");
    const submittedConfirmation = String(formData.get("confirmation") ?? "");

    setError("");
    if (submittedPassword.length < 8) {
      setError("Use a password with at least 8 characters.");
      return;
    }
    if (submittedPassword !== submittedConfirmation) {
      setError("The passwords do not match.");
      return;
    }

    setSubmitting(true);
    const { data, error: signupError } = await supabase.functions.invoke<{ status: string }>("sign-up", {
      body: { email, username, password: submittedPassword },
    });

    if (signupError || data?.status !== "pending") {
      const code = signupError?.message ?? "signup_failed";
      setError(signupErrors[code] ?? signupErrorMessage(signupError));
      setSubmitting(false);
      return;
    }

    router.replace("/sign-in?created=1");
  }

  return (
    <form className="signup-form" onSubmit={submit}>
      <div className="signup-form-intro"><span className="form-step">01</span><div><strong>Set up your access</strong><p>Use an email you check regularly for account updates.</p></div></div>
      <div className="field-grid single-column">
        <label className="signup-field">Email address<input name="email" type="email" required autoComplete="email" disabled={submitting} placeholder="you@example.com" /></label>
        <label className="signup-field">Username<input name="username" minLength={2} maxLength={100} required autoComplete="username" disabled={submitting} placeholder="How you’ll appear in the library" /></label>
        <label className="signup-field">Password<div className="password-input"><input name="password" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" disabled={submitting} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 8 characters" /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div><span className={`field-feedback ${passwordReady ? "valid" : ""}`}>{passwordReady ? "Password length looks good" : "Use at least 8 characters"}</span></label>
        <label className="signup-field">Confirm password<div className="password-input"><input name="confirmation" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" disabled={submitting} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Repeat your password" aria-invalid={confirmation.length > 0 && !passwordsMatch} /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)}>{showPassword ? "Hide" : "Show"}</button></div>{confirmation.length > 0 && <span className={`field-feedback ${passwordsMatch ? "valid" : "invalid"}`}>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</span>}</label>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <p className="security-note"><span aria-hidden="true">▣</span> Your information is used only to manage your protected library access.</p>
      <button className="button signup-submit" type="submit" disabled={submitting}>{submitting ? <><span className="button-spinner" />Creating account...</> : "Create account"}</button>
      <p className="signin-prompt">Already have an account? <a href="/sign-in">Sign in</a></p>
    </form>
  );
}
