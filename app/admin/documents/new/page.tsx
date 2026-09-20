import { AdminDocumentUploadForm } from "@/components/admin-document-upload-form";

export default function NewDocumentPage() {
  return (
    <main className="page-shell">
      <nav className="workspace-nav" aria-label="Admin navigation">
        <a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Admin</small></span></a>
        <div className="nav-actions"><a className="nav-link" href="/library">View library</a><a className="nav-link active" href="/admin">Dashboard</a></div>
      </nav>
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library / Admin</p>
        <div className="heading-row"><div><h1>Add documents</h1><p>Only active administrator accounts can upload. Select up to 20 PDFs at once, up to 3 GB each.</p></div><a className="nav-link" href="/admin">← Back to dashboard</a></div>
      </section>
      <AdminDocumentUploadForm />
    </main>
  );
}
