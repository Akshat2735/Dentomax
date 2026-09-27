import Link from "next/link";

export default function CourseNotFound() {
  return <main className="library-shell course-shell" id="main-content"><section className="courses-empty course-not-found"><span>!</span><h1>Course not found</h1><p>This course does not exist in the local Dentomax course catalogue.</p><div className="not-found-actions"><Link className="button" href="/courses">Return to Courses</Link><Link className="button secondary-button" href="/">Go home</Link></div></section></main>;
}
