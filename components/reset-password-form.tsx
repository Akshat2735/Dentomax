"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

type ResetState = "checking" | "ready" | "saving" | "saved" | "expired" | "error";

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setState(data.session ? "ready" : "expired");
    }

    void checkRecoverySession();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" && session) setState("ready");
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setState("error");
      setMessage("Use a password with at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setState("error");
      setMessage("The passwords do not match.");
      return;
    }

    setState("saving");
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setState("error");
      setMessage("We could not update your password. Request a new reset link and try again.");
      return;
    }

    setState("saved");
    setTimeout(() => router.replace("/sign-in?reset=1"), 700);
  }

  if (state === "checking") {
    return <section className="access-card auth-loading" aria-live="polite"><div className="skeleton-line short" /><div className="skeleton-line wide" /><p>Checking your reset link...</p></section>;
  }

  if (state === "expired") {
    return (
      <section className="access-card">
        <p>This reset link is invalid or has expired. Request a new link to continue.</p>
        <a className="button" href="/forgot-password">Request a new link</a>
      </section>
    );
  }

  if (state === "saved") {
    return <section className="access-card" role="status"><p>Your password was updated. Taking you to sign in...</p></section>;
  }

  return (
    <form className="upload-card" onSubmit={submit}>
      <div className="field-grid single-column">
        <label>
          New password
          <input type="password" minLength={8} required autoComplete="new-password" value={password} disabled={state === "saving"} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Confirm new password
          <input type="password" minLength={8} required autoComplete="new-password" value={confirmation} disabled={state === "saving"} onChange={(event) => setConfirmation(event.target.value)} />
        </label>
      </div>
      {message && <p className="notice error" role="alert">{message}</p>}
      <button className="button" type="submit" disabled={state === "saving"}>{state === "saving" ? "Updating password..." : "Update password"}</button>
    </form>
  );
}
