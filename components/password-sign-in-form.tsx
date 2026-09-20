"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

type PasswordSignInFormProps = {
  redirectTo: string;
};

export function PasswordSignInForm({ redirectTo }: PasswordSignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const awaitingConfirmedSession = useRef(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase persists the session asynchronously. Redirect only after this
      // listener has received the persisted session, never after signIn returns.
      if (!awaitingConfirmedSession.current || !session) return;

      awaitingConfirmedSession.current = false;
      router.replace(redirectTo);
    });

    return () => subscription.unsubscribe();
  }, [redirectTo, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    setError("");
    setSubmitting(true);
    awaitingConfirmedSession.current = true;

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      awaitingConfirmedSession.current = false;
      setSubmitting(false);
      setError("We could not sign you in. Check your email and password.");
    }
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <div className="field-grid single-column">
        <label>
          Email address
          <input name="email" type="email" required autoComplete="email" disabled={submitting} />
        </label>
        <label>
          Password
          <input name="password" type="password" required autoComplete="current-password" disabled={submitting} />
        </label>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</button>
      <a className="form-link" href="/forgot-password">Forgot your password?</a>
      {redirectTo === "/library" && <a className="form-link" href="/sign-up">Need an account? Create one</a>}
    </form>
  );
}
