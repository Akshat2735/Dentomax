import Link from "next/link";

export default function AboutPage() {
  return <main className="page-shell about-page" id="main-content">
    <section className="page-heading">
      <p className="eyebrow">About Dentomax</p>
      <h1>A focused environment for dental learning.</h1>
      <p>Dentomax brings together publicly available course information and a protected professional reference library in one calm, considered learning space.</p>
    </section>
    <section className="account-profile-card">
      <div><p className="eyebrow">How access works</p><h2>Explore first. Sign in when it matters.</h2><p>Course discovery and course details are public. An account is only needed for the protected book library, your account, and future personal learning functions. Administrators have a separate, role-protected workspace.</p></div>
    </section>
    <section className="account-actions"><div><p className="eyebrow">Start here</p><h2>Choose your learning path.</h2><p>Browse the course catalogue without creating an account, or sign in to access approved reference material.</p></div><div><Link className="button" href="/courses">Explore courses</Link><Link className="button secondary-button" href="/books">Visit Books</Link></div></section>
  </main>;
}
