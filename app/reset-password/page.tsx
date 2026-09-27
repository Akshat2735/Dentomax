import { ResetPasswordForm } from "@/components/reset-password-form";

export default function ResetPasswordPage() {
  return (
    <main className="page-shell narrow auth-shell" id="main-content">
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library</p>
        <h1>Choose a new password</h1>
        <p>Set a new password for your library account.</p>
      </section>
      <ResetPasswordForm />
    </main>
  );
}
