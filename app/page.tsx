import Link from "next/link";

export default function HomePage() {
  return (
    <main className="landing">
      <nav className="landing-nav" aria-label="Main navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><a className="nav-link" href="/sign-in">Sign in</a></nav>
      <p className="eyebrow">Dentomax Library</p>
      <h1>Dental knowledge, thoughtfully organised.</h1>
      <p>A protected reference library for clinical resources, research, and practical learning.</p>
      <div className="landing-actions">
        <Link className="button" href="/library">Open library</Link>
        <Link className="button secondary-button" href="/sign-up">Create account</Link>
      </div>
    </main>
  );
}
