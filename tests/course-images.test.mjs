import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { COURSE_IMAGE_ALT, COURSE_IMAGE_WIDTHS, courseImageAlt, courseImageSlug, courseImageSrcSet } from "../lib/course-images.ts";

const dir = new URL("../public/course-images/", import.meta.url);
const originals = readdirSync(dir).filter((f) => /\.(jpe?g|png)$/i.test(f));

test("there are course images to check", () => assert.ok(originals.length > 0));

for (const file of originals) {
  const slug = file.replace(/\.[^.]+$/, "");
  test(`${slug}: has a written alt text and every WebP size`, () => {
    const alt = COURSE_IMAGE_ALT[slug];
    assert.ok(alt && alt.length >= 20 && alt.length <= 125, "alt text must exist and be 20-125 characters");
    for (const width of COURSE_IMAGE_WIDTHS) assert.ok(existsSync(new URL(`${slug}-${width}.webp`, dir)), `${slug}-${width}.webp is missing; run scripts/optimize-course-images.py`);
  });
}

test("no alt text is left for a course image that no longer exists", () => {
  const slugs = new Set(originals.map((f) => f.replace(/\.[^.]+$/, "")));
  for (const slug of Object.keys(COURSE_IMAGE_ALT)) assert.ok(slugs.has(slug), `alt text for unknown image ${slug}`);
});

test("srcset and alt helpers", () => {
  assert.equal(courseImageSlug("/course-images/a-b.jpg"), "a-b");
  assert.equal(courseImageSrcSet("/course-images/a-b.png"), "/course-images/a-b-640.webp 640w, /course-images/a-b-1300.webp 1300w");
  assert.equal(courseImageSrcSet("/somewhere/else.jpg"), undefined);
  assert.equal(courseImageAlt("/course-images/unknown.jpg", "Fallback text"), "Fallback text");
});
