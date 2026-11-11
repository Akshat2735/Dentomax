import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanCourseText, cleanEligibility, cleanSummaryText, courseDuration, isFillerItem, leadText, stripFiller, tidyLabel, FILLER_BLOCK } from "../lib/clean-text.ts";

const read = (name) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
const sources = read("dentomax-academy-courses.json");
const summaries = read("dentomax-academy-course-summaries.json");

const FILLER_WORDS = /Illustrator|thumbnail|sketching process|10 minutes or it might|project brief/i;
const OFF_TOPIC = /German|entrepreneur|promo video|13,000\+/i;

// Reviewed by reading each course's own text (see PR description). null = no single clear duration.
// international-fellowship says "10-day", "6 months" and "one year" in different places, so nothing is shown
// until the client confirms which is right.
// What the "Who this course is for" section shows. Only three courses had extra text glued onto it.
const EXPECTED_ELIGIBILITY = {
  "international-fellowship-in-facial-aesthetics": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-hair-restoration-removal-medical": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-chemical-peels": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-advance-machine-procedures-in-cosmetology": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-aesthetic-dentistry": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-advanced-laser-cosmetology": "MBBS / BAMS / BUMS / BHMS & BDS",
  "fellowship-in-trichology": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-micropigmentation-non-medical": "10+2",
  "post-graduate-diploma-in-clinical-cosmetology-medical": "MBBS / BAMS / BUMS / BHMS & BDS",
  "msc-in-facial-aesthetics": "MBBS / BAMS / BUMS / BHMS & BDS",
  "fellowship-in-facial-aesthetics-fifa": "MBBS / BAMS / BUMS / BHMS & BDS",
  "post-graduate-diploma-in-clinical-cosmetology-non-medical": "MSC Nursing/ BSC Nursing/ 10+2",
  "msc-in-cosmetology-non-medical": "Bsc Nursing/Msc Nursing/ 10+2",
  "msc-in-aesthetic-nursing": "MBBS/BDS/BUMS/BAMS/Bsc Nursing/Msc Nursing",
  "certification-in-advanced-endodontics": "MBBS / BAMS / BUMS / BHMS & BDS",
  "certification-in-injectables-medical": "MBBS / BAMS / BUMS / BHMS & BDS",
};

const EXPECTED_DURATION = {
  "international-fellowship-in-facial-aesthetics": null,
  "certification-in-hair-restoration-removal-medical": null,
  "certification-in-chemical-peels": "4 days",
  "certification-in-advance-machine-procedures-in-cosmetology": null,
  "certification-in-aesthetic-dentistry": "4 days",
  "certification-in-advanced-laser-cosmetology": null,
  "fellowship-in-trichology": "1 year",
  "certification-in-micropigmentation-non-medical": null,
  "post-graduate-diploma-in-clinical-cosmetology-medical": "4 days",
  "msc-in-facial-aesthetics": "2 years",
  "fellowship-in-facial-aesthetics-fifa": "1 year",
  "post-graduate-diploma-in-clinical-cosmetology-non-medical": "4 days",
  "msc-in-cosmetology-non-medical": "2 years",
  "msc-in-aesthetic-nursing": "2 years",
  "certification-in-advanced-endodontics": "4 days",
  "certification-in-injectables-medical": null,
};

test("every course has a reviewed expected duration", () => {
  assert.deepEqual(new Set(sources.map((c) => c.slug)), new Set(Object.keys(EXPECTED_DURATION)));
});

for (const source of sources) {
  const cleaned = cleanCourseText(source.fullPublicText, source.curriculumItems, source.eligibilitySourceText);

  test(`${source.slug}: text and summary are clean`, () => {
    assert.ok(!FILLER_WORDS.test(cleaned.text), "filler paragraph still in the text");
    assert.ok(cleaned.short.length >= 150 && cleaned.short.length <= 430, `summary length ${cleaned.short.length}`);
    assert.match(cleaned.short, /[.!?]$/, "summary must end at the end of a sentence");
    assert.ok(!OFF_TOPIC.test(cleaned.short), "summary is about another subject");
    const spaced = (t) => t.replace(/\s+([.,;:!?])/g, "$1");
    assert.ok(cleaned.short.startsWith(spaced(cleaned.text).slice(0, 40)), "summary should be the start of the course text");
    assert.ok(!/\s[.,;:!?]/.test(cleaned.short), "stray space before punctuation");
  });

  test(`${source.slug}: topic list is clean`, () => {
    assert.ok(cleaned.curriculumItems.length > 0);
    for (const item of cleaned.curriculumItems) {
      assert.ok(!/:\s*$/.test(item), `label with a dangling colon: ${item}`);
      assert.ok(!FILLER_WORDS.test(item), `filler item: ${item}`);
    }
    const removed = source.curriculumItems.length - cleaned.curriculumItems.length;
    const hadFiller = FILLER_WORDS.test(source.fullPublicText);
    assert.ok(hadFiller ? removed === 9 : removed === 0, `removed ${removed} items (expected ${hadFiller ? 9 : 0})`);
  });

  test(`${source.slug}: eligibility is just the qualifications`, () => {
    assert.equal(cleaned.eligibility, EXPECTED_ELIGIBILITY[source.slug]);
    assert.ok(!FILLER_WORDS.test(cleaned.eligibility ?? ""));
  });

  test(`${source.slug}: duration is ${EXPECTED_DURATION[source.slug] ?? "not shown"}`, () => {
    assert.equal(cleaned.duration, EXPECTED_DURATION[source.slug]);
  });

  test(`${source.slug}: catalogue card and course page agree`, () => {
    const summary = summaries.find((s) => s.slug === source.slug);
    const card = cleanSummaryText(summary);
    assert.equal(card.shortDescription, cleaned.short);
    assert.equal(card.duration, cleaned.duration);
    assert.ok(!FILLER_WORDS.test(card.searchText), "filler left in the search text");
  });
}

test("the filler block is only removed when it is really there", () => {
  assert.equal(stripFiller("A normal paragraph about peels."), "A normal paragraph about peels.");
  assert.equal(stripFiller(`Real text. ${FILLER_BLOCK}`), "Real text.");
  assert.equal(isFillerItem("Take as much time as you need for this step — this might be 10 minutes or it might be 10 days."), true);
  assert.equal(isFillerItem("Skin Analysis and Consultation :"), false);
  assert.equal(isFillerItem("Safety"), false);
});

test("labels lose only the dangling colon", () => {
  assert.equal(tidyLabel("Hands-On Practical Sessions :"), "Hands-On Practical Sessions");
  assert.equal(tidyLabel("Live Demonstrations:"), "Live Demonstrations");
  assert.equal(tidyLabel("Understand skin: Structure & Function"), "Understand skin: Structure & Function");
});

test("summary stops before a label and fixes spacing", () => {
  assert.equal(leadText("First sentence here. Key Highlights: Duration: 6 Months and more text."), "First sentence here.");
  assert.equal(leadText("Offered by the Academy . It is great, really ."), "Offered by the Academy. It is great, really.");
});

test("duration is one consistent format, and absent when the text disagrees", () => {
  assert.equal(courseDuration("Over four days of training."), "4 days");
  assert.equal(courseDuration("Duration: 6 Months"), "6 months");
  assert.equal(courseDuration("a one-year program, over one year"), "1 year");
  assert.equal(courseDuration("a two intensive days course"), "2 days");
  assert.equal(courseDuration("Duration: 6 Months. Over one year."), null);
  assert.equal(courseDuration("No length is given here."), null);
});

test("eligibility keeps the qualification list and drops what was glued on", () => {
  assert.equal(cleanEligibility(null), null);
  assert.equal(cleanEligibility("10+2"), "10+2");
  assert.equal(cleanEligibility("MBBS / BAMS & BDS Plasma Pen Safety Protocols"), "MBBS / BAMS & BDS");
  assert.equal(cleanEligibility("Anyone with a passion for skincare"), "Anyone with a passion for skincare");
});
