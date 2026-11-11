// Cleanup for the course text.
//
// The courses were copied from the original WordPress website, whose pages contained leftover page-builder
// code and placeholder text. Everything here only REMOVES or REFORMATS those leftovers; nothing writes new
// facts about a course. The source data files are never edited, so re-running the catalogue sync scripts
// is safe. tests/ check every function against the real course data.

const INVISIBLE_CHARACTERS = /[​-‍⁠﻿]/g;

/** Squash whitespace and drop zero-width characters so strings can be compared and matched reliably. */
export function collapse(value: string): string {
  return value.replace(INVISIBLE_CHARACTERS, "").replace(/\s+/g, " ").trim();
}

// ---- Headings ---------------------------------------------------------------------------------------
// A few headings still carry the tail of a page-builder shortcode, e.g.
//   Main Features:” font_container=”tag:h4|text_align:left” google_fonts=”font_family:Montserrat…”]
// Left alone, that unbreakable string is shown to visitors and (on phones) stretches the whole page
// sideways. This keeps only the readable label ("Main Features:").

const SHORTCODE_ATTRIBUTES = /[\s”“"']*\b(?:font_container|google_fonts|use_theme_fonts|text_align|el_class|css_animation)\s*=[\s\S]*$/i;

export function cleanHeading(value: string): string {
  return value
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(SHORTCODE_ATTRIBUTES, "")
    .replace(/[\]”“"']+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ---- Placeholder text left on the original site -------------------------------------------------------
// A graphic-design tutorial paragraph ("sketches", "thumbnails", "Illustrator") was left on the original
// site and ended up at the end of five course pages (chemical peels, laser, trichology, micropigmentation,
// endodontics) - both in the description and as 9 fake "curriculum" items. Only this exact block is removed.
export const FILLER_BLOCK =
  "The main objective to the sketching process is to generate super rough thumbnail sketches of what we feel best visually communicates the highlighted words from our mind maps. Take as much time as you need for this step — this might be 10 minutes or it might be 10 days. Personally, I like to work quickly and try not to analyze or elaborate too much. Now, that doesn’t mean you should only create a handful of sketches. Even though this step only took a couple of hours, I was still able to put over 100 thumbnails on paper. The whole point of this process is to flush out the bad ideas and narrow down the good ones until we find that one layout that really speaks to us. Also, keep in mind the project brief and have your list in front of you as a reference to avoid getting sidetracked. Remember—detail is not needed. Simply flush out the bad ideas and find a great direction. Once I feel I have a good direction with the sketches, I’m now ready to take a quick photo with my phone and import it into Illustrator.";

/** Remove the tutorial filler paragraph from a piece of text. */
export function stripFiller(value: string): string {
  const text = collapse(value);
  return text.includes(FILLER_BLOCK) ? text.split(FILLER_BLOCK).join(" ").replace(/\s+/g, " ").trim() : text;
}

/** True for a curriculum item that is one of the sentences of the filler paragraph. */
export function isFillerItem(item: string): boolean {
  const text = collapse(item);
  return text.length >= 20 && FILLER_BLOCK.includes(text);
}

/** "Hands-On Practical Sessions :" -> "Hands-On Practical Sessions" (the text after the colon was lost in the source). */
export function tidyLabel(item: string): string {
  return collapse(item).replace(/\s*:\s*$/, "");
}

// ---- Summary ----------------------------------------------------------------------------------------
// A short Title Case label followed by a colon ("Key Highlights: Duration: 6 Months ..."): the intro ends here.
const LABEL_START = /^[A-Z][A-Za-z&’' -]{2,40}\s?:\s/;

/**
 * The summary shown on cards, at the top of a course page and in search results: the first whole sentences
 * of the course text (about 180-420 characters). The original excerpts were cut off in the middle of a
 * sentence and, for two courses (endodontics, machine procedures), were about completely different subjects.
 */
export function leadText(fullText: string, target = 180, max = 420): string {
  const sentences = collapse(fullText).split(/(?<=[.!?])\s+(?=[A-Z“"])/);
  const picked: string[] = [];
  for (const sentence of sentences) {
    if (LABEL_START.test(sentence)) break;
    if (picked.length > 0 && picked.join(" ").length + sentence.length + 1 > max) break;
    picked.push(sentence);
    if (picked.join(" ").length >= target) break;
  }
  return picked.join(" ").replace(/\s+([.,;:!?])/g, "$1");
}

// ---- Duration ---------------------------------------------------------------------------------------
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
const DURATION_PATTERN = /\b(?:(\d+)|(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve))[\s-]+(?:(?:intensive|comprehensive|immersive|full|consecutive|hands-on)\s+)?(day|week|month|year)s?\b/gi;

/**
 * The course length in one consistent format ("4 days", "6 months", "1 year"), or null when the text does
 * not give one clear answer. If the text mentions different lengths (the International Fellowship says
 * "6 months", "10 days" and "one year") nothing is shown rather than guessing which one is right.
 */
export function courseDuration(text: string): string | null {
  const found = new Set<string>();
  for (const match of text.matchAll(DURATION_PATTERN)) {
    const amount = match[1] ? Number(match[1]) : NUMBER_WORDS[match[2].toLowerCase()];
    found.add(`${amount} ${match[3].toLowerCase()}${amount === 1 ? "" : "s"}`);
  }
  return found.size === 1 ? [...found][0] : null;
}

// ---- Eligibility ------------------------------------------------------------------------------------
// The "eligibility" text was captured up to the end of the page section, so for three courses it also holds
// something else: endodontics - the filler paragraph; machine procedures - the whole topic outline (1,264
// characters); international fellowship - the certifying body. The real eligibility is always the leading
// list of qualifications ("MBBS / BAMS / BUMS / BHMS & BDS", "10+2", ...), so keep that and drop the rest.
const QUALIFICATION_LIST = /^(?:(?:MBBS|BAMS|BUMS|BHMS|BDS|[BM]\s?Sc\.?\s*Nursing|10\+2)\s*[/&,]?\s*)+/i;

export function cleanEligibility(value: string | null): string | null {
  if (value == null) return null;
  const text = stripFiller(value);
  const leading = QUALIFICATION_LIST.exec(text)?.[0];
  const cleaned = leading ? leading.replace(/[\s/&,]+$/, "") : text;
  return cleaned || null;
}

// ---- Putting it together ----------------------------------------------------------------------------
export type CleanedCourseText = { text: string; short: string; duration: string | null; curriculumItems: string[]; eligibility: string | null };

/** Cleaned text, summary, duration and curriculum for a course, from its raw full text and topic list. */
export function cleanCourseText(fullPublicText: string, curriculumItems: string[], eligibility: string | null = null): CleanedCourseText {
  const text = stripFiller(fullPublicText);
  return {
    text,
    short: leadText(text),
    duration: courseDuration(text),
    curriculumItems: curriculumItems.filter((item) => !isFillerItem(item)).map(tidyLabel).filter(Boolean),
    eligibility: cleanEligibility(eligibility),
  };
}

/**
 * The catalogue summaries file only carries a search blob that starts with "<title> <category> <full text>".
 * This derives the same cleaned summary and duration from it, so the cards and the course pages always agree.
 */
export function cleanSummaryText(summary: { title: string; category: string; searchText: string }) {
  const prefix = `${collapse(summary.title)} ${collapse(summary.category)} `;
  const blob = stripFiller(summary.searchText);
  const body = blob.startsWith(prefix) ? blob.slice(prefix.length) : blob;
  return { shortDescription: leadText(body), duration: courseDuration(body), searchText: blob };
}
