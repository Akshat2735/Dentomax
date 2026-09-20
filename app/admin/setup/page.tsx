import { AdminClaimForm } from "@/components/admin-claim-form";

export default function AdminSetupPage() {
  return (
    <main className="page-shell narrow auth-shell">
      <nav className="auth-nav" aria-label="Administrator navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Admin</small></span></a><a className="nav-link" href="/admin/sign-in">Admin sign in</a></nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library / Admin</p>
        <h1>Administrator setup</h1>
        <p>Sign in with the account you want to manage this library, then claim the first administrator account.</p>
      </section>
      <AdminClaimForm />
    </main>
  );
}
