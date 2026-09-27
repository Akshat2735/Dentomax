import { PasswordSignInForm } from "@/components/password-sign-in-form";

function safeDestination(value: string | undefined) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ created?: string; reset?: string; next?: string }> }) {
  const params = await searchParams;
  const destination = safeDestination(params.next);
  const booksDestination = destination === "/books";
  return <main className="page-shell narrow auth-shell" id="main-content"><section className="page-heading"><p className="eyebrow">Dentomax Library</p><h1>Sign in</h1><p>{booksDestination ? "Sign in to access the book library and explore the available references." : "Sign in to access your account and protected library resources."} New accounts are reviewed before library access is enabled.</p></section>{params.created === "1" && <p className="notice success" role="status">Your account was created. Sign in now; library access will be enabled after administrator approval.</p>}{params.reset === "1" && <p className="notice success" role="status">Your password was updated. Sign in with your new password.</p>}<PasswordSignInForm redirectTo={destination} /><p className="page-footer-link">Need an account? <a className="form-link" href={`/sign-up?next=${encodeURIComponent(destination)}`}>Create one</a></p></main>;
}
