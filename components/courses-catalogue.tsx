"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { courseCategories, courseSummaries } from "@/lib/course-summaries";

export function CoursesCatalogue() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const visibleCourses = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return courseSummaries.filter((course) => (category === "all" || course.category === category) && (!search || course.searchText.toLocaleLowerCase().includes(search)));
  }, [category, query]);

  return <main className="library-shell course-shell">
    <section className="courses-hero">
      <p className="eyebrow">Dentomax Academy</p>
      <h1>Professional courses, clearly explored.</h1>
      <p>Browse publicly listed Dentomax Academy programmes by discipline, learning focus, and eligibility.</p>
      <div className="courses-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search courses, topics, or specialties" aria-label="Search courses" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear course search">×</button>}</div>
    </section>
    <section className="courses-listing" id="course-catalogue" aria-label="Course catalogue">
      <div className="courses-toolbar"><p><strong>{visibleCourses.length}</strong> of {courseSummaries.length} courses</p><label>Category <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{courseCategories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label></div>
      {visibleCourses.length ? <div className="courses-grid">{visibleCourses.map((course) => <article className="course-card" key={course.slug}><img src={course.imagePath} alt={course.imageAlt} loading="lazy" /><div><p className="course-category">{course.category}</p><h2>{course.title}</h2><p>{course.shortDescription}</p>{course.durationClaims[0] && <span className="course-duration">{course.durationClaims[0]}</span>}<Link href={`/courses/${course.slug}`}>View course <span aria-hidden="true">→</span></Link></div></article>)}</div> : <div className="courses-empty"><span>⌕</span><h2>No courses found</h2><p>Try a different search term or category.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Clear filters</button></div>}
    </section>
  </main>;
}
