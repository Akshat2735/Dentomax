"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export function AdminClaimForm() {
  const router = useRouter();
  const [state, setState] = useState<"ready" | "working" | "error">("ready");
  const [message, setMessage] = useState("");

  async function claimAdminAccess() {
    setState("working");
    setMessage("");
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setState("error");
      setMessage("Sign in first, then return to this page.");
      return;
    }

    const { data, error } = await supabase.functions.invoke<{ status: string }>("admin-claim");
    if (error || data?.status !== "active") {
      setState("error");
      setMessage(error?.message === "Edge Function returned a non-2xx status code"
        ? "An administrator account already exists, or your profile has not been created yet."
        : "We could not finish administrator setup. Try again.");
      return;
    }

    router.replace("/admin");
  }

  return (
    <section className="access-card">
      <p>Use your signed-in account as the first administrator for this library. This setup works only while no active administrator exists.</p>
      {message && <p className="notice error" role="alert">{message}</p>}
      <button className="button" type="button" onClick={() => void claimAdminAccess()} disabled={state === "working"}>
        {state === "working" ? "Setting up administrator..." : "Set up administrator access"}
      </button>
    </section>
  );
}
