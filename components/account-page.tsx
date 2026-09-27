"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";

type AccountState = "loading" | "ready" | "signedout";

export function AccountPage() {
  const router = useRouter();
  const [state, setState] = useState<AccountState>("loading");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let active = true;
    const update = () => supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      const user = data.user;
      if (!user) { setState("signedout"); return; }
      setEmail(user.email ?? "");
      setName(String(user.user_metadata?.username ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? ""));
      setState("ready");
    });
    void update();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { if (!session && active) setState("signedout"); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  useEffect(() => { if (state === "signedout") router.replace("/sign-in?next=/account"); }, [router, state]);
  async function signOut() { setLeaving(true); await supabase.auth.signOut(); router.replace("/"); }
  if (state !== "ready") return <main className="page-shell narrow auth-shell account-loading"><span className="system-spinner" aria-hidden="true" /><p role="status">Checking your account…</p></main>;
  return <main className="page-shell account-shell" id="main-content"><nav className="auth-nav" aria-label="Account navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><a className="nav-link" href="/dashboard">Study dashboard</a></nav><section className="account-hero"><p className="eyebrow">Account</p><h1>Your academy account.</h1><p>Account information is shown from your active secure session. Profile editing and avatar uploads are not enabled in this library yet.</p></section><section className="account-profile-card"><div className="account-avatar" aria-hidden="true">{(name || email || "D").slice(0,1).toUpperCase()}</div><div><p className="eyebrow">Profile summary</p><h2>{name || "Dentomax member"}</h2><dl><dt>Email</dt><dd>{email}</dd><dt>Account access</dt><dd>Managed through Dentomax Library</dd></dl></div></section><section className="account-actions"><div><p className="eyebrow">Security</p><h2>Password and session</h2><p>Use password recovery when you need to set a new password. Signing out ends this browser session.</p></div><div><a className="button secondary-button" href="/forgot-password">Reset password</a><button className="account-signout" type="button" onClick={() => void signOut()} disabled={leaving}>{leaving ? "Signing out…" : "Sign out"}</button></div></section></main>;
}
