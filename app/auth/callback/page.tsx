"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Establishing your secure session…");
  useEffect(() => {
    let active = true;
    async function finishAuthentication() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (!code) { if (active) setMessage("This sign-in link is invalid or has expired. Please sign in again."); return; }
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!active) return;
      if (error) { setMessage("This sign-in link is invalid or has expired. Please request a new link or sign in again."); return; }
      router.replace(params.get("type") === "recovery" ? "/reset-password" : "/library");
    }
    void finishAuthentication();
    return () => { active = false; };
  }, [router]);
  return <main className="system-state"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><span className="system-spinner" aria-hidden="true"/><p role="status">{message}</p>{message.includes("invalid") && <a className="button" href="/sign-in">Return to sign in</a>}</main>;
}
