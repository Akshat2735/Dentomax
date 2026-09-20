import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="page-shell narrow auth-shell">
      <nav className="auth-nav" aria-label="Account navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><a className="nav-link" href="/sign-in">Sign in</a></nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library</p>
        <h1>Reset your password</h1>
        <p>Enter your account email and we will send you a secure reset link.</p>
      </section>
      <ForgotPasswordForm />
    </main>
  );
}
