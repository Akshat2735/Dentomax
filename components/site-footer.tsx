"use client";

import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <Link className="brand-lockup" href="/">
            <span className="brand-mark">D</span>
            <span>
              Dentomax <small>Library</small>
            </span>
          </Link>
          <p>A considered digital reference space for clinical learning, academic discovery, and professional development.</p>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/courses">Courses</Link>
          <Link href="/books">Books</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
      <div className="footer-base">
        <span>© {year} Dentomax Library</span>
        <span>Clinical knowledge, thoughtfully organised.</span>
      </div>
    </footer>
  );
}
