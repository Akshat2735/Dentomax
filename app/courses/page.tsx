import { CoursesCatalogue } from "@/components/courses-catalogue";
import type { Metadata } from "next";
import { courseSummaries } from "@/lib/course-summaries";

export const metadata: Metadata = {
  title: "Course catalogue",
  description: `Browse ${courseSummaries.length} professional dental, facial aesthetics and cosmetology courses, with published curriculum, eligibility and public pricing.`,
};

export default function CoursesPage() {
  return <CoursesCatalogue />;
}
