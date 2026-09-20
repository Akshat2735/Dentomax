import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="page-shell narrow auth-shell">
      <nav className="auth-nav" aria-label="Account navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><a className="nav-link" href="/sign-in">Sign in</a></nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library</p>
        <h1>Choose a new password</h1>
        <p>Set a new password for your library account.</p>
      </section>
      <ResetPasswordForm />
    </main>
  );
}
