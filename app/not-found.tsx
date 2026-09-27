import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found-page" id="main-content">
      <span className="not-found-mark" aria-hidden="true">404</span>
      <p className="eyebrow">Digital library</p>
      <h1>This page is not on the shelf.</h1>
      <p>The address may be mistyped, or the record may have been moved. Return to a known room in Dentomax.</p>
      <div className="not-found-actions">
        <Link className="button" href="/">Go home</Link>
        <Link className="button secondary-button" href="/courses">Go to Courses</Link>
        <Link className="button secondary-button" href="/books">Go to Books</Link>
      </div>
    </main>
  );
}
