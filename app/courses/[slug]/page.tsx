import { notFound } from "next/navigation";
import { CourseDetail } from "@/components/course-detail";
import { LibraryNavigation } from "@/components/library-navigation";
import { courseBySlug, courses } from "@/lib/courses";

export function generateStaticParams() { return courses.map(({ slug }) => ({ slug })); }
export const dynamicParams = false;

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  return <><LibraryNavigation /><CourseDetail course={course} /></>;
}
