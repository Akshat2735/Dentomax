"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AdminDocumentUploadForm } from "@/components/admin-document-upload-form";
import { supabase } from "@/lib/supabase-browser";

type Profile = {
  id: string;
  username: string;
  status: "active" | "revoked";
  role: "student" | "admin";
  created_at: string;
};

type AccessState = "hydrating" | "signed_out" | "forbidden" | "ready" | "error";
type TableState = "loading" | "ready" | "error";
type LibraryStats = { documents: number; subjects: number };
type AdminDocument = { id: string; title: string; subject: string; file_type: "pdf" | "epub" | "zip"; file_size: number | null; };

function functionStatus(error: unknown): number | null {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const context = (error as { context?: unknown }).context;
  return context instanceof Response ? context.status : null;
}

function actionError(error: unknown, fallback: string): string {
  if (functionStatus(error) === 403) return "Your administrator access is no longer active.";
  return fallback;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

export function AdminDashboard() {
  const [accessState, setAccessState] = useState<AccessState>("hydrating");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [tableState, setTableState] = useState<TableState>("loading");
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdPassword, setCreatedPassword] = useState("");
  const [updatingUserIds, setUpdatingUserIds] = useState<Set<string>>(new Set());
  const [userErrors, setUserErrors] = useState<Record<string, string>>({});
  const [libraryStats, setLibraryStats] = useState<LibraryStats>({ documents: 0, subjects: 0 });
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [deletingDocumentIds, setDeletingDocumentIds] = useState<Set<string>>(new Set());
  const [documentErrors, setDocumentErrors] = useState<Record<string, string>>({});
  const [documentQuery, setDocumentQuery] = useState("");

  const loadProfiles = useCallback(async () => {
    setTableState("loading");
    const [{ data, error }, { data: documents, error: documentsError }] = await Promise.all([
      supabase.from("profiles").select("id, username, status, role, created_at").order("created_at", { ascending: false }),
      supabase.from("documents").select("id, title, subject, file_type, file_size").order("created_at", { ascending: false }),
    ]);

    if (error || documentsError) {
      setTableState("error");
      return;
    }
    setProfiles((data ?? []) as Profile[]);
    setDocuments((documents ?? []) as AdminDocument[]);
    setLibraryStats({ documents: documents?.length ?? 0, subjects: new Set((documents ?? []).map((document) => document.subject)).size });
    setTableState("ready");
  }, []);

  useEffect(() => {
    let disposed = false;

    async function checkAdminAccess(userId: string | undefined) {
      if (!userId) {
        if (!disposed) {
          setCurrentUserId(null);
          setProfiles([]);
          setAccessState("signed_out");
        }
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, status")
        .eq("id", userId)
        .maybeSingle();

      if (disposed) return;
      if (error) {
        setAccessState("error");
        return;
      }
      if (profile?.role !== "admin" || profile.status !== "active") {
        setAccessState("forbidden");
        return;
      }

      setCurrentUserId(userId);
      setAccessState("ready");
      void loadProfiles();
    }

    // This is an interface gate only. Every mutating action below is enforced
    // again by its Edge Function before it can touch Auth, Postgres, or R2.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "SIGNED_OUT") {
        void checkAdminAccess(session?.user.id);
      }
    });

    return () => {
      disposed = true;
      subscription.unsubscribe();
    };
  }, [loadProfiles]);

  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const username = String(formData.get("username") ?? "").trim();
    setCreatingUser(true);
    setCreateError("");
    setCreatedPassword("");

    const { data, error } = await supabase.functions.invoke<{ password: string }>(
      "admin-create-user",
      { body: { email, username } },
    );

    setCreatingUser(false);
    if (error || !data?.password) {
      setCreateError(actionError(error, "The account could not be created. Check the details and try again."));
      return;
    }

    form.reset();
    setCreatedPassword(data.password);
    void loadProfiles();
  }

  async function updateUserStatus(profile: Profile) {
    const nextStatus = profile.status === "active" ? "revoked" : "active";
    setUpdatingUserIds((current) => new Set(current).add(profile.id));
    setUserErrors((current) => ({ ...current, [profile.id]: "" }));

    const { data, error } = await supabase.functions.invoke<{ userId: string; status: Profile["status"] }>(
      "admin-update-user-status",
      { body: { userId: profile.id, status: nextStatus } },
    );

    setUpdatingUserIds((current) => {
      const next = new Set(current);
      next.delete(profile.id);
      return next;
    });
    if (error || !data) {
      setUserErrors((current) => ({
        ...current,
        [profile.id]: actionError(error, "The user status could not be updated. Try again."),
      }));
      return;
    }

    setProfiles((current) => current.map((entry) => entry.id === profile.id ? { ...entry, status: data.status } : entry));
  }

  async function deleteDocument(document: AdminDocument) {
    if (!window.confirm(`Delete “${document.title}” permanently? The stored file and library record will be removed.`)) return;
    setDeletingDocumentIds((current) => new Set(current).add(document.id));
    setDocumentErrors((current) => ({ ...current, [document.id]: "" }));

    const { data, error } = await supabase.functions.invoke<{ documentId: string; deleted: string }>(
      "admin-delete-document",
      { body: { documentId: document.id } },
    );

    setDeletingDocumentIds((current) => {
      const next = new Set(current);
      next.delete(document.id);
      return next;
    });
    if (error || data?.deleted !== "true") {
      setDocumentErrors((current) => ({ ...current, [document.id]: actionError(error, "The document could not be deleted. Try again.") }));
      return;
    }
    setDocuments((current) => current.filter((entry) => entry.id !== document.id));
    setLibraryStats((current) => ({ ...current, documents: Math.max(0, current.documents - 1) }));
  }

  if (accessState === "hydrating") {
    return <section className="access-card" aria-live="polite"><p>Checking administrator access…</p></section>;
  }
  if (accessState === "signed_out") {
    return <section className="access-card"><p>Sign in with an active administrator account to manage the library.</p><a className="button" href="/admin/sign-in">Admin sign in</a></section>;
  }
  if (accessState === "forbidden") {
    return <section className="access-card"><p>This account is not an active administrator and cannot access the dashboard.</p></section>;
  }
  if (accessState === "error") {
    return <section className="access-card"><p>We could not confirm your administrator access. Refresh the page and try again.</p></section>;
  }

  const activeUsers = profiles.filter((profile) => profile.status === "active").length;
  const waitingUsers = profiles.filter((profile) => profile.status === "revoked").length;
  const adminUsers = profiles.filter((profile) => profile.role === "admin").length;
  const matchingDocuments = documents.filter((document) => [document.title, document.subject, document.file_type]
    .join(" ").toLowerCase().includes(documentQuery.trim().toLowerCase()));

  return <div className="admin-dashboard">
    <section className="dashboard-overview">
      <div><p className="eyebrow">Workspace overview</p><h2>Good to see you.</h2><p>Keep your collection organised and access intentional.</p></div>
      <div className="overview-metrics"><div><span className="metric-icon">▤</span><strong>{libraryStats.documents}</strong><span>Total documents</span></div><div><span className="metric-icon">◌</span><strong>{libraryStats.subjects}</strong><span>Subjects</span></div><div><span className="metric-icon">♙</span><strong>{profiles.length}</strong><span>Registered users</span></div><div><span className="metric-icon pending">◷</span><strong>{waitingUsers}</strong><span>Pending users</span></div></div>
    </section>
    <section className="dashboard-section">
      <div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>Create user</h2></div></div>
      <form className="upload-card" onSubmit={createUser}>
        <div className="field-grid">
          <label>Email address<input name="email" type="email" autoComplete="email" required disabled={creatingUser} /></label>
          <label>Username<input name="username" maxLength={100} required disabled={creatingUser} /></label>
        </div>
        {createError && <p className="notice error" role="alert">{createError}</p>}
        {createdPassword && <div className="notice success" role="status">
          <strong>Account created. Copy this password now—it will not be shown again.</strong>
          <code className="one-time-password">{createdPassword}</code>
        </div>}
        <button className="button" type="submit" disabled={creatingUser}>{creatingUser ? "Creating user…" : "Create user"}</button>
      </form>
    </section>

    <section className="dashboard-section">
      <div className="section-heading"><div><p className="eyebrow">Library</p><h2>Upload documents</h2><p>Files upload directly from this browser to R2 after server-side authorization.</p></div></div>
      <AdminDocumentUploadForm />
    </section>

    <section className="dashboard-section">
      <div className="section-heading"><div><p className="eyebrow">Accounts</p><h2>Manage users</h2></div><button className="document-open" type="button" onClick={() => void loadProfiles()} disabled={tableState === "loading"}>Refresh</button></div>
      {tableState === "loading" && <section className="access-card table-skeleton" aria-live="polite"><div className="skeleton-line short" /><div className="skeleton-line" /><div className="skeleton-line" /></section>}
      {tableState === "error" && <section className="access-card"><p>We could not load users. <button className="inline-button" type="button" onClick={() => void loadProfiles()}>Try again</button></p></section>}
      {tableState === "ready" && <div className="user-table-wrap">
        <table className="user-table">
          <thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Action</th></tr></thead>
          <tbody>{profiles.map((profile) => {
            const updating = updatingUserIds.has(profile.id);
            const isSelf = profile.id === currentUserId;
            return <tr key={profile.id}>
              <td><strong>{profile.username}</strong>{userErrors[profile.id] && <p className="table-error" role="alert">{userErrors[profile.id]}</p>}</td>
              <td>{profile.role}</td>
              <td><span className={`status-pill ${profile.status}`}>{profile.status}</span></td>
              <td>{formatDate(profile.created_at)}</td>
              <td><button className="document-open" type="button" onClick={() => void updateUserStatus(profile)} disabled={updating || (isSelf && profile.status === "active")}>{updating ? "Updating…" : profile.status === "active" ? "Revoke" : "Reactivate"}</button>{isSelf && profile.status === "active" && <small className="self-note">Your own account</small>}</td>
            </tr>;
          })}</tbody>
        </table>
        {!profiles.length && <p className="empty-table">No profiles found.</p>}
      </div>}
    </section>

    <section className="dashboard-section documents-management-section">
      <div className="section-heading"><div><p className="eyebrow">Library</p><h2>Manage documents</h2><p>Remove a document and its protected stored file from the collection.</p></div><span className="status-pill active">{documents.length} stored</span></div>
      {!!documents.length && <label className="admin-document-search"><span aria-hidden="true">⌕</span><input value={documentQuery} onChange={(event) => setDocumentQuery(event.target.value)} placeholder="Search by title, subject, or format" aria-label="Search stored documents" />{documentQuery && <button type="button" onClick={() => setDocumentQuery("")} aria-label="Clear document search">×</button>}</label>}
      {!documents.length && <div className="access-card"><p>No documents have been added yet.</p></div>}
      {!!documents.length && <div className="admin-document-list">{matchingDocuments.map((document) => {
        const deleting = deletingDocumentIds.has(document.id);
        return <div className="admin-document-row" key={document.id}><span className={`document-icon ${document.file_type}`} aria-hidden="true"><span>{document.file_type.toUpperCase()}</span></span><div className="admin-document-copy"><strong title={document.title}>{document.title}</strong><small>{document.subject} · {document.file_type.toUpperCase()}{document.file_size ? ` · ${(document.file_size / 1024 / 1024).toFixed(1)} MB` : ""}</small>{documentErrors[document.id] && <p className="table-error" role="alert">{documentErrors[document.id]}</p>}</div><button className="delete-button" type="button" onClick={() => void deleteDocument(document)} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</button></div>;
      })}</div>}
      {!!documents.length && !matchingDocuments.length && <div className="admin-empty-results"><strong>No documents match your search.</strong><button type="button" className="inline-button" onClick={() => setDocumentQuery("")}>Clear search</button></div>}
    </section>
  </div>;
}
