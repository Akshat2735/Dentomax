import { PasswordSignInForm } from "@/components/password-sign-in-form";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ created?: string; reset?: string }> }) {
  const params = await searchParams;
  return <main className="page-shell narrow auth-shell"><nav className="auth-nav" aria-label="Account navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><a className="nav-link" href="/sign-up">Create account</a></nav><section className="page-heading"><p className="eyebrow">Dentomax Library</p><h1>Sign in</h1><p>Use your library account to access protected documents. New accounts are reviewed before access is enabled.</p></section>{params.created === "1" && <p className="notice success" role="status">Your account was created. Sign in now; library access will be enabled after administrator approval.</p>}{params.reset === "1" && <p className="notice success" role="status">Your password was updated. Sign in with your new password.</p>}<PasswordSignInForm redirectTo="/library" /></main>;
}
