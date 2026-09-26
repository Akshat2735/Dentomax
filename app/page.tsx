import Link from "next/link";

export default function HomePage() {
  return (
    <main className="institution-home">
      <nav className="landing-nav institutional-nav" aria-label="Main navigation"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><span><a className="nav-link" href="/courses">Courses</a><a className="nav-link" href="/sign-in">Sign in</a></span></nav>
      <section className="home-hero"><div className="home-hero-copy"><p className="eyebrow">Dentomax learning environment</p><h1>Where clinical curiosity finds its reference point.</h1><p>Protected dental resources and structured professional courses, arranged for focused study and lifelong clinical learning.</p><div className="landing-actions"><Link className="button" href="/library">Enter the library <span>→</span></Link><Link className="button secondary-button" href="/courses">Explore courses</Link></div></div><div className="home-hero-art" aria-hidden="true"><div className="art-orbit"/><div className="art-book art-book-one">CLINICAL<br/>ATLAS</div><div className="art-book art-book-two">DENTAL<br/>SCIENCE</div><div className="art-book art-book-three">CASE<br/>NOTES</div><span className="art-cross">+</span></div></section>
      <section className="home-principles"><div><span>01</span><h2>Curated reference</h2><p>Keep the material that supports sound clinical thinking within reach.</p></div><div><span>02</span><h2>Structured learning</h2><p>Explore professional course information in an academic, easy-to-scan format.</p></div><div><span>03</span><h2>Private by design</h2><p>Access to protected library resources is reviewed and intentionally managed.</p></div></section>
      <section className="home-pathways"><div><p className="eyebrow">A place to begin</p><h2>Build a stronger learning practice.</h2><p>Move between your reference library and the course catalogue without losing your place.</p></div><div className="home-pathway-links"><Link href="/explore"><span>⌕</span><strong>Discover resources</strong><small>Search by specialty, title, and topic.</small><b>→</b></Link><Link href="/courses"><span>▤</span><strong>Browse courses</strong><small>Read complete public course information.</small><b>→</b></Link></div></section>
    </main>
  );
}
