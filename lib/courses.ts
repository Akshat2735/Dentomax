import sourceCatalogue from "@/data/dentomax-academy-courses.json";

type SourceCourse = {
  sourceId: number; slug: string; title: string; category: string; sourceUrl: string; sourceVerifiedAt: string;
  excerptHtml: string; contentHtml: string; fullPublicText: string; headings: string[]; emphasizedHeadings: string[];
  curriculumItems: string[]; eligibilitySourceText: string | null; tags: number[];
  price: { amount: string; regularAmount: string; saleAmount: string; currency: string; currencySymbol: string; minorUnit: number; isOnSale: boolean } | null;
  featuredImage: { url: string; alt: string; captionHtml: string };
};

export type Course = {
  sourceId: number; slug: string; title: string; category: string;
  source: { url: string; verifiedAt: string };
  descriptions: { short: string; fullPublicText: string; sourceHtml: string };
  metadata: { level: null; price: { amount: number; currency: string; originalAmount: number | null; saleAmount: number | null; isFree: boolean; priceLabel: string | null; discountLabel: string | null } | null; format: null; schedule: null; durationClaims: string[]; tags: number[] };
  instructors: []; eligibility: string | null; requirements: []; objectives: []; learningOutcomes: [];
  features: string[]; certification: string[]; enrolment: null; faqs: []; relatedCourses: []; testimonials: [];
  media: { featuredImage: { localPath: string; sourceUrl: string; alt: string; captionHtml: string }; additional: [] };
  curriculum: { structure: "flat-topic-list"; items: string[] };
  additionalSections: { type: "source-section"; title: string; content: string }[];
};

function plainText(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/\[[^\]]*]/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim(); }
function durationClaims(text: string) { return [...new Set(text.match(/(?:Duration\s*:\s*)?(?:\d+\s*(?:day|days|week|weeks|month|months|year|years)|one year|two years)/gi) ?? [])]; }
function localImagePath(slug: string, sourceUrl: string) { const extension = sourceUrl.match(/\.(png|jpe?g|webp)(?:$|\?)/i)?.[1]?.toLowerCase() ?? "jpg"; return `/course-images/${slug}.${extension === "jpeg" ? "jpg" : extension}`; }
function priceAmount(value: string, minorUnit: number) { return Number(value) / 10 ** minorUnit; }

export const courses: Course[] = (sourceCatalogue as SourceCourse[]).map((source) => {
  const short = plainText(source.excerptHtml).replace(/\[&hellip;\]|\[\.\.\.\]|&hellip;/gi, "").trim();
  const features = source.curriculumItems.filter((item) => /(?:hands-on|live demonstration|interactive workshop|certification exam|placement assistance|internship|clinical exposure|case-based|case discussion)/i.test(item));
  const certification = source.curriculumItems.filter((item) => /certification/i.test(item));
  const sectionTitles = [...new Set([...source.headings, ...source.emphasizedHeadings])];
  const sourcePrice = source.price;
  const price = sourcePrice ? {
    amount: priceAmount(sourcePrice.amount, sourcePrice.minorUnit),
    currency: sourcePrice.currency,
    originalAmount: sourcePrice.isOnSale ? priceAmount(sourcePrice.regularAmount, sourcePrice.minorUnit) : null,
    saleAmount: sourcePrice.isOnSale ? priceAmount(sourcePrice.saleAmount, sourcePrice.minorUnit) : null,
    isFree: sourcePrice.amount === "0",
    priceLabel: null,
    discountLabel: null,
  } : null;
  return {
    sourceId: source.sourceId, slug: source.slug, title: source.title.replace(/\s+/g, " ").trim(), category: source.category,
    source: { url: source.sourceUrl, verifiedAt: source.sourceVerifiedAt },
    descriptions: { short, fullPublicText: source.fullPublicText, sourceHtml: source.contentHtml },
    metadata: { level: null, price, format: null, schedule: null, durationClaims: durationClaims(source.fullPublicText), tags: source.tags },
    instructors: [], requirements: [], objectives: [], learningOutcomes: [], eligibility: source.eligibilitySourceText,
    features: [...new Set(features)], certification: [...new Set(certification)], enrolment: null, faqs: [], relatedCourses: [], testimonials: [],
    media: { featuredImage: { localPath: localImagePath(source.slug, source.featuredImage.url), sourceUrl: source.featuredImage.url, alt: source.featuredImage.alt, captionHtml: source.featuredImage.captionHtml }, additional: [] },
    curriculum: { structure: "flat-topic-list", items: source.curriculumItems },
    additionalSections: sectionTitles.map((title) => ({ type: "source-section", title, content: "This heading and its associated public course-page content are preserved in the full public content record." })),
  };
});

export function courseBySlug(slug: string) { return courses.find((course) => course.slug === slug); }
export const courseCategories = [...new Set(courses.map((course) => course.category))].sort();
