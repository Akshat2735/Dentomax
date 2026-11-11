import { ForgotPasswordForm } from "@/components/forgot-password-form";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reset your password",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <main className="page-shell narrow auth-shell" id="main-content">
      <section className="page-heading">
        <p className="eyebrow">Dentomax Library</p>
        <h1>Reset your password</h1>
        <p>Enter your account email and we will send you a secure reset link.</p>
      </section>
      <ForgotPasswordForm />
    </main>
  );
}
