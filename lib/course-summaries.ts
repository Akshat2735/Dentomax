import summaries from "@/data/dentomax-academy-course-summaries.json";
import { cleanSummaryText } from "@/lib/clean-text";

export type CourseSummary = {
  slug: string; title: string; category: string; shortDescription: string;
  durationClaims: string[]; searchText: string; imagePath: string; imageAlt: string;
  price: { amount: string; regularAmount: string; saleAmount: string; currency: string; currencySymbol: string; minorUnit: number; isOnSale: boolean } | null;
};

// The summary, duration and search text are cleaned with the same code as the course pages (lib/clean-text.ts),
// so a card and its course page always agree.
export const courseSummaries: CourseSummary[] = (summaries as CourseSummary[]).map((summary) => {
  const cleaned = cleanSummaryText(summary);
  return { ...summary, shortDescription: cleaned.shortDescription, durationClaims: cleaned.duration ? [cleaned.duration] : [], searchText: cleaned.searchText };
});
export const courseCategories = [...new Set(courseSummaries.map((course) => course.category))].sort();
