import { AdminSignInForm } from "@/components/admin-sign-in-form";

export default function AdminSignInPage() {
  return (
    <main className="page-shell narrow auth-shell">
      <nav className="auth-nav" aria-label="Administrator navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Admin</small></span></a><a className="nav-link" href="/sign-in">Library sign in</a></nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library / Admin</p>
        <h1>Sign in</h1>
        <p>Use the administrator account created for this library. Public registration is disabled.</p>
      </section>
      <AdminSignInForm />
      <p className="page-footer-link"><a className="form-link" href="/admin/setup">First-time administrator setup</a></p>
    </main>
  );
}
