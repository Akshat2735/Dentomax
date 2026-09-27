"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { courseCategories, courseSummaries, type CourseSummary } from "@/lib/course-summaries";

type PriceFilter = "all" | "paid";
type Sort = "default" | "title" | "price-low" | "price-high";
type CatalogueState = { query: string; category: string; price: PriceFilter; sort: Sort };
const allowedSorts: Sort[] = ["default", "title", "price-low", "price-high"];

function readState(params: URLSearchParams): CatalogueState {
  const category = params.get("category") ?? "all";
  return { query: params.get("q") ?? "", category: courseCategories.includes(category) ? category : "all", price: params.get("price") === "paid" ? "paid" : "all", sort: allowedSorts.includes(params.get("sort") as Sort) ? params.get("sort") as Sort : "default" };
}
function priceValue(course: CourseSummary) { return course.price ? Number(course.price.amount) / 10 ** course.price.minorUnit : null; }
function priceLabel(course: CourseSummary) {
  const value = priceValue(course);
  return value === null ? "Price unavailable" : value === 0 ? "FREE" : new Intl.NumberFormat("en-IN", { style: "currency", currency: course.price!.currency, maximumFractionDigits: value % 1 ? 2 : 0 }).format(value);
}

export function CoursesCatalogue() {
  const router = useRouter(); const pathname = usePathname(); const searchParams = useSearchParams();
  const [state, setState] = useState<CatalogueState>(() => readState(new URLSearchParams(searchParams.toString())));
  const [suggestionsOpen, setSuggestionsOpen] = useState(false); const [activeSuggestion, setActiveSuggestion] = useState(-1); const [filtersOpen, setFiltersOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const routeState = searchParams.toString();

  useEffect(() => { setState(readState(new URLSearchParams(routeState))); }, [routeState]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "/" && !(event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement)) { event.preventDefault(); searchRef.current?.focus(); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, []);

  const update = (patch: Partial<CatalogueState>) => {
    const next = { ...state, ...patch };
    setState(next);
    const params = new URLSearchParams();
    if (next.query.trim()) params.set("q", next.query.trim());
    if (next.category !== "all") params.set("category", next.category);
    if (next.price !== "all") params.set("price", next.price);
    if (next.sort !== "default") params.set("sort", next.sort);
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, { scroll: false });
  };
  const reset = () => update({ query: "", category: "all", price: "all", sort: "default" });
  const search = state.query.trim().toLocaleLowerCase();
  const visibleCourses = useMemo(() => {
    const results = courseSummaries.filter((course) => (state.category === "all" || course.category === state.category) && (state.price !== "paid" || (priceValue(course) ?? 0) > 0) && (!search || course.searchText.toLocaleLowerCase().includes(search)));
    return [...results].sort((a, b) => state.sort === "title" ? a.title.localeCompare(b.title) : state.sort === "price-low" ? (priceValue(a) ?? Infinity) - (priceValue(b) ?? Infinity) : state.sort === "price-high" ? (priceValue(b) ?? -1) - (priceValue(a) ?? -1) : 0);
  }, [search, state.category, state.price, state.sort]);
  const suggestions = useMemo(() => search ? courseSummaries.filter((course) => course.searchText.toLocaleLowerCase().includes(search)).slice(0, 5) : [], [search]);
  const categorySuggestions = useMemo(() => search ? courseCategories.filter((category) => category.toLocaleLowerCase().includes(search)).slice(0, 3) : [], [search]);
  const allSuggestions = [...suggestions.map((course) => ({ type: "course" as const, course })), ...categorySuggestions.map((category) => ({ type: "category" as const, category }))];
  const activeFilters = [{ key: "category", value: state.category, label: state.category }, { key: "price", value: state.price, label: "Paid courses" }].filter((filter) => filter.value !== "all");
  const selectSuggestion = (item: typeof allSuggestions[number]) => { if (item.type === "course") router.push(`/courses/${item.course.slug}`); else { update({ category: item.category, query: "" }); setSuggestionsOpen(false); } };
  const filterControls = <div className="catalogue-filter-controls"><label><span>Category</span><select value={state.category} onChange={(event) => update({ category: event.target.value })}><option value="all">All disciplines</option>{courseCategories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label><fieldset><legend>Course fee</legend><label className="filter-option"><input type="radio" name="price" checked={state.price === "all"} onChange={() => update({ price: "all" })} /> All courses</label><label className="filter-option"><input type="radio" name="price" checked={state.price === "paid"} onChange={() => update({ price: "paid" })} /> Paid courses</label></fieldset></div>;

  return <main className="library-shell course-shell catalogue-shell" id="main-content">
    <section className="courses-hero catalogue-hero"><div className="catalogue-hero-copy"><p className="eyebrow">Dentomax academic catalogue</p><h1>Medical learning, structured for you.</h1><p>Browse {courseSummaries.length} local course records, their published curriculum, and verified public pricing in one focused academic catalogue.</p></div><div className="catalogue-search-wrap"><div className="courses-search catalogue-search"><span aria-hidden="true">⌕</span><input ref={searchRef} value={state.query} onFocus={() => setSuggestionsOpen(true)} onChange={(event) => { update({ query: event.target.value }); setSuggestionsOpen(true); setActiveSuggestion(-1); }} onKeyDown={(event) => { if (event.key === "Escape") setSuggestionsOpen(false); if (event.key === "ArrowDown" && allSuggestions.length) { event.preventDefault(); setActiveSuggestion((current) => Math.min(current + 1, allSuggestions.length - 1)); } if (event.key === "ArrowUp" && allSuggestions.length) { event.preventDefault(); setActiveSuggestion((current) => Math.max(current - 1, 0)); } if (event.key === "Enter" && activeSuggestion >= 0) { event.preventDefault(); selectSuggestion(allSuggestions[activeSuggestion]); } }} placeholder="Search courses, curriculum, or specialties" aria-label="Search courses" aria-controls="course-search-suggestions" aria-expanded={suggestionsOpen && allSuggestions.length > 0} />{state.query && <button type="button" onClick={() => { update({ query: "" }); searchRef.current?.focus(); }} aria-label="Clear course search">×</button>}<kbd>/</kbd></div>{suggestionsOpen && allSuggestions.length > 0 && <div className="course-suggestions" id="course-search-suggestions" role="listbox" aria-label="Course search suggestions">{allSuggestions.map((item, index) => item.type === "course" ? <button type="button" role="option" aria-selected={activeSuggestion === index} className={activeSuggestion === index ? "active" : ""} key={item.course.slug} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(item)}><img src={item.course.imagePath} alt="" /><span><strong>{item.course.title}</strong><small>{item.course.category}{item.course.durationClaims[0] ? ` · ${item.course.durationClaims[0]}` : ""}</small></span><b>→</b></button> : <button type="button" role="option" aria-selected={activeSuggestion === index} className={activeSuggestion === index ? "active" : ""} key={item.category} onMouseDown={(event) => event.preventDefault()} onClick={() => selectSuggestion(item)}><span className="suggestion-mark" aria-hidden="true">⌘</span><span><strong>{item.category}</strong><small>Filter by discipline</small></span><b>→</b></button>)}</div>}</div><div className="catalogue-stats"><span><strong>{courseSummaries.length}</strong> published courses</span><span><strong>{courseCategories.length}</strong> disciplines</span><span>Local course pages</span></div>
    </section>
    <section className="courses-listing catalogue-listing" id="course-catalogue" aria-label="Course catalogue"><div className="catalogue-controls"><div><p className="eyebrow">Discover courses</p><p className="catalogue-result-count"><strong>{visibleCourses.length}</strong> {visibleCourses.length === 1 ? "course" : "courses"} {visibleCourses.length !== courseSummaries.length && <>of {courseSummaries.length}</>}</p></div><div className="catalogue-control-actions"><button className="catalogue-filter-button" type="button" onClick={() => setFiltersOpen(true)} aria-expanded={filtersOpen}>Filters{activeFilters.length ? ` · ${activeFilters.length}` : ""}</button><label className="catalogue-sort"><span>Sort</span><select value={state.sort} onChange={(event) => update({ sort: event.target.value as Sort })}><option value="default">Catalogue order</option><option value="title">Alphabetical</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div></div>
      {activeFilters.length > 0 && <div className="active-filters" aria-label="Active filters">{activeFilters.map((filter) => <button type="button" key={filter.key} onClick={() => update({ [filter.key]: "all" })}>{filter.label} <span aria-hidden="true">×</span></button>)}<button type="button" className="clear-all" onClick={reset}>Clear all</button></div>}
      <div className="catalogue-layout"><aside className="catalogue-filter-panel" aria-label="Filter courses"><div className="filter-panel-heading"><div><p className="eyebrow">Refine results</p><h2>Find your focus</h2></div>{activeFilters.length > 0 && <button type="button" onClick={reset}>Clear</button>}</div>{filterControls}</aside>{visibleCourses.length ? <div className="courses-grid premium-course-grid">{visibleCourses.map((course) => <CourseCard course={course} key={course.slug} />)}</div> : <div className="courses-empty catalogue-empty"><span aria-hidden="true">⌕</span><h2>We couldn’t find a matching course.</h2><p>Try another clinical topic, a shorter keyword, or return to the full academic catalogue.</p><button type="button" onClick={reset}>View all courses</button></div>}</div>
    </section>
    {filtersOpen && <div className="catalogue-filter-backdrop" role="presentation" onMouseDown={() => setFiltersOpen(false)}><section className="catalogue-filter-sheet" role="dialog" aria-modal="true" aria-label="Filter courses" onMouseDown={(event) => event.stopPropagation()}><div className="filter-sheet-heading"><div><p className="eyebrow">Refine results</p><h2>Course filters</h2></div><button type="button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></div>{filterControls}<div className="filter-sheet-actions"><button type="button" onClick={reset}>Clear all</button><button className="button" type="button" onClick={() => setFiltersOpen(false)}>Show {visibleCourses.length} courses</button></div></section></div>}
  </main>;
}

function CourseCard({ course }: { course: CourseSummary }) { return <article className="course-card premium-course-card"><div className="course-image-frame"><img src={course.imagePath} alt={course.imageAlt || `${course.title} course`} loading="lazy" /><span className="course-card-price">{priceLabel(course)}</span></div><div><p className="course-category">{course.category}</p><h2>{course.title}</h2><p>{course.shortDescription}</p><div className="course-card-meta">{course.durationClaims[0] && <span>{course.durationClaims[0]}</span>}<span>{priceLabel(course)}</span></div><Link href={`/courses/${course.slug}`}>Start Learning <span aria-hidden="true">→</span></Link></div></article>; }
