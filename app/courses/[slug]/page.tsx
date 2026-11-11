import { notFound } from "next/navigation";
import { CourseDetail } from "@/components/course-detail";
import { courseBySlug, courses } from "@/lib/courses";
import type { Metadata } from "next";

// Search results show about 155 characters, so cut the course excerpt at a word boundary.
function metaDescription(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= 155) return clean;
  return clean.slice(0, 154).replace(/\s+\S*$/, "") + "…";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) return {};
  return { title: course.title, description: metaDescription(course.descriptions.short) };
}

export function generateStaticParams() { return courses.map(({ slug }) => ({ slug })); }
export const dynamicParams = false;

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();
  return <CourseDetail course={course} />;
}
