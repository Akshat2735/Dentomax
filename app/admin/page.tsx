import { AdminDashboard } from "@/components/admin-dashboard";

export default function AdminDashboardPage() {
  return (
    <main className="page-shell admin-page-shell">
      <nav className="workspace-nav" aria-label="Admin navigation">
        <a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Admin</small></span></a>
        <div className="nav-actions"><a className="nav-link" href="/library">View library</a><a className="nav-link active" href="/admin">Dashboard</a></div>
      </nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library</p>
        <div className="heading-row"><div><h1>Administration</h1><p>Keep your knowledge collection healthy, organised, and intentionally accessible.</p></div><span className="status-chip admin-chip"><span className="status-dot" />Administrator</span></div>
      </section>
      <AdminDashboard />
    </main>
  );
}
