"use client";

import { FormEvent, useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { EMAIL_MAX, validateEmail } from "@/lib/validation";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"ready" | "sending" | "sent" | "error">("ready");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailProblem = validateEmail(email);
    if (emailProblem) {
      setState("error");
      setMessage(emailProblem);
      return;
    }
    setState("sending");
    setMessage("");
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setState("error");
      setMessage("We could not send the reset email. Check the address and try again.");
      return;
    }

    setState("sent");
  }

  if (state === "sent") {
    return (
      <section className="access-card" role="status">
        <p>Check your email for a password reset link. The link expires quickly for your security.</p>
        <a className="form-link" href="/sign-in">Return to sign in</a>
      </section>
    );
  }

  return (
    <form className="upload-card" onSubmit={submit} noValidate>
      <label>
        Email address
        <input
          name="email"
          type="email"
          required
          maxLength={EMAIL_MAX}
          autoComplete="email"
          aria-invalid={state === "error" && Boolean(validateEmail(email))}
          value={email}
          disabled={state === "sending"}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {message && <p className="notice error" role="alert">{message}</p>}
      <button className="button" type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending email..." : "Send reset link"}
      </button>
      <a className="form-link" href="/sign-in">Back to sign in</a>
    </form>
  );
}
