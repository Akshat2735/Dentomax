"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Course } from "@/lib/courses";

const groupItems = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
const labels: Record<string, string> = { overview: "Overview", highlights: "Highlights", eligibility: "Who it is for", curriculum: "Curriculum", certification: "Certification", information: "Details" };

function formatPrice(price: NonNullable<Course["metadata"]["price"]>) {
  if (price.isFree) return "FREE";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: price.currency, maximumFractionDigits: price.amount % 1 ? 2 : 0 }).format(price.amount);
}

function readableParagraphs(text: string) { return text.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean); }

export function CourseDetail({ course }: { course: Course }) {
  const [openGroup, setOpenGroup] = useState<number | null>(0);
  const sections = ["overview", course.features.length ? "highlights" : null, course.eligibility ? "eligibility" : null, "curriculum", course.certification.length ? "certification" : null, "information"].filter(Boolean) as string[];
  const [activeSection, setActiveSection] = useState(sections[0]);
  const groups = useMemo(() => groupItems(course.curriculum.items, 18), [course.curriculum.items]);
  const price = course.metadata.price;

  useEffect(() => {
    const elements = sections.map((section) => document.getElementById(section)).filter((element): element is HTMLElement => Boolean(element));
    const observer = new IntersectionObserver((entries) => {
      const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (current) setActiveSection(current.target.id);
    }, { rootMargin: "-28% 0px -62% 0px", threshold: 0.01 });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections.join("|")]);

  return <main className="library-shell course-shell course-detail">
    <nav className="course-breadcrumb" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/courses">Courses</Link><span>/</span><b>{course.title}</b></nav>
    <section className="course-detail-hero">
      <div className="course-hero-copy"><p className="eyebrow">{course.category}</p><h1>{course.title}</h1><p className="course-hero-summary">{course.descriptions.short}</p><div className="course-facts" aria-label="Course facts">{course.metadata.durationClaims.slice(0, 2).map((claim) => <span key={claim}><b>Duration</b>{claim}</span>)}{course.metadata.level && <span><b>Level</b>{course.metadata.level}</span>}{course.eligibility && <span><b>For</b>Eligible applicants</span>}</div><div className="hero-enquiry"><div><small>Course price</small><strong>{price ? formatPrice(price) : "Price unavailable"}</strong>{price && price.originalAmount !== null && <s>{new Intl.NumberFormat("en-IN", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(price.originalAmount)}</s>}</div><a className="button" href="#enquiry">Enquire about this course <span>→</span></a></div></div>
      <img src={course.media.featuredImage.localPath} alt={course.media.featuredImage.alt || `${course.title} course`} />
    </section>
    <nav className="course-section-nav" aria-label="Course sections">{sections.map((section) => <a href={`#${section}`} key={section} aria-current={activeSection === section ? "location" : undefined}>{labels[section]}</a>)}</nav>
    <div className="course-detail-grid"><div className="course-main-content">
      <section id="overview"><p className="eyebrow">Course overview</p><h2>About this course</h2><p className="course-lead">{course.descriptions.short}</p><details className="course-content-disclosure"><summary>Read the complete public course information <span>+</span></summary><div className="course-source-prose">{readableParagraphs(course.descriptions.fullPublicText).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></details></section>
      {course.features.length > 0 && <section id="highlights"><p className="eyebrow">What the source highlights</p><h2>Course highlights</h2><p className="section-intro">These items are taken directly from the published course topics and features; no outcomes have been inferred.</p><ul className="course-checklist">{course.features.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      {course.eligibility && <section id="eligibility"><p className="eyebrow">Who this course is for</p><h2>Eligibility and requirements</h2><p>{course.eligibility}</p></section>}
      <section id="curriculum"><p className="eyebrow">Course contents</p><h2>Complete published curriculum</h2><p className="section-intro">The source publishes an ordered topic list, rather than consistently named modules and lessons. Every listed topic is retained here in its published order.</p><div className="curriculum-overview"><span>{course.curriculum.items.length} published topics</span><span>{groups.length} easy-to-scan sections</span></div><div className="course-curriculum">{groups.map((items, groupIndex) => { const first = groupIndex * 18 + 1; const last = first + items.length - 1; const expanded = openGroup === groupIndex; return <section className="curriculum-group" key={first}><button type="button" aria-expanded={expanded} onClick={() => setOpenGroup(expanded ? null : groupIndex)}><span><small>Section {String(groupIndex + 1).padStart(2, "0")} · topics {first}–{last}</small><strong>{items[0]?.replace(/\s*:\s*$/, "") || "Published course topics"}</strong></span><span aria-hidden="true">{expanded ? "−" : "+"}</span></button>{expanded && <ol start={first}>{items.map((item, index) => <li key={`${groupIndex}-${index}`}>{item}</li>)}</ol>}</section>; })}</div></section>
      {course.certification.length > 0 && <section id="certification"><p className="eyebrow">Certification</p><h2>Published certification information</h2><ul className="course-checklist single-column">{course.certification.map((item) => <li key={item}>{item}</li>)}</ul></section>}
      <section id="information"><p className="eyebrow">Information availability</p><h2>Details provided publicly</h2>{course.additionalSections.length > 0 && <div className="source-section-list">{course.additionalSections.map((section) => <span key={section.title}>{section.title}</span>)}</div>}<p className="section-intro">The public source does not provide instructor profiles, FAQ entries, related-course links, or private lesson material for this course. They have not been fabricated here.</p></section>
    </div>
    <aside className="course-sidebar">
      <section className="course-price-card" id="enquiry"><p className="eyebrow">Course price</p>{price ? <><div className="course-price"><strong>{formatPrice(price)}</strong>{price.originalAmount !== null && <span><s>{new Intl.NumberFormat("en-IN", { style: "currency", currency: price.currency, maximumFractionDigits: 0 }).format(price.originalAmount)}</s>{price.discountLabel}</span>}</div>{price.priceLabel && <p>{price.priceLabel}</p>}</> : <p>Price is not publicly available for this course.</p>}<a className="button" href="#enquiry-note">Request course information <span>→</span></a><p id="enquiry-note" className="enquiry-note">Enrollment is not processed in this library. Use this record to discuss availability with your institution administrator.</p></section>
      <section><p className="eyebrow">Course information</p><dl>{course.metadata.durationClaims.length > 0 && <><dt>Duration claims</dt><dd>{course.metadata.durationClaims.join("; ")}</dd></>}<dt>Category</dt><dd>{course.category}</dd>{course.metadata.level ? <><dt>Level</dt><dd>{course.metadata.level}</dd></> : null}<dt>Course format</dt><dd>Not publicly specified</dd></dl></section>
      <Link className="sidebar-course-link" href="/courses#course-catalogue">Back to course catalogue →</Link>
    </aside></div>
    <a className="course-mobile-enquiry" href="#enquiry"><span>{price ? formatPrice(price) : "Course information"}</span><b>Enquire →</b></a>
    <section className="course-disclosure"><p><strong>Local course record.</strong> This course is rendered from Dentomax’s locally stored course data and image assets. Source URLs are retained only for internal provenance; browsing stays within Dentomax.</p></section>
  </main>;
}
