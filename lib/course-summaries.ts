import summaries from "@/data/dentomax-academy-course-summaries.json";

export type CourseSummary = {
  slug: string; title: string; category: string; shortDescription: string;
  durationClaims: string[]; searchText: string; imagePath: string; imageAlt: string;
};

export const courseSummaries = summaries as CourseSummary[];
export const courseCategories = [...new Set(courseSummaries.map((course) => course.category))].sort();
