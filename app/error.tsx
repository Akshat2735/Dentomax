"use client";
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="system-state"><a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a><h1>Something went wrong.</h1><p>We couldn’t load this page. Please try again.</p><button className="button" onClick={reset}>Try again</button></main>}
