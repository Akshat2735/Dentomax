import Link from "next/link";
import { LibraryNavigation } from "@/components/library-navigation";

export default function CourseNotFound() {
  return <><LibraryNavigation /><main className="library-shell course-shell"><section className="courses-empty course-not-found"><span>!</span><h1>Course not found</h1><p>This course does not exist in the local Dentomax course catalogue.</p><Link href="/courses">Return to Courses</Link></section></main></>;
}
