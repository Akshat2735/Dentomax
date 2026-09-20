import { SignUpForm } from "@/components/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="signup-shell">
      <section className="signup-brand-panel">
        <a className="brand-lockup" href="/"><span className="brand-mark">D</span><span>Dentomax <small>Library</small></span></a>
        <div className="signup-brand-copy"><p className="eyebrow">DENTOMAX LIBRARY</p><h1>Access a curated dental knowledge collection.</h1><p>Build a trusted reference space for the procedures, anatomy, and clinical thinking that shape exceptional care.</p><div className="review-note"><span className="review-icon">✓</span><div><strong>Thoughtful access, by design.</strong><span>Every registration is reviewed before library access is enabled.</span></div></div></div>
        <div className="medical-orbit" aria-hidden="true"><span className="orbit orbit-one" /><span className="orbit orbit-two" /><span className="orbit-core">+</span></div>
        <p className="signup-footer">Private clinical knowledge space <span>·</span> Dentomax Library</p>
      </section>
      <section className="signup-form-panel"><div className="signup-form-heading"><p className="eyebrow">Create your account</p><h2>Welcome in.</h2><p>Register to request access to the library.</p></div><SignUpForm /></section>
    </main>
  );
}
