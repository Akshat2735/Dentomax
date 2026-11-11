// Guards the visitor-facing pages against developer-style wording ("locally stored course records",
// "no outcomes have been inferred", "Source URLs are retained for internal provenance", ...).
// If this fails, rewrite the sentence for a visitor instead of adding an exception.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const FILES = ["app/page.tsx", "app/about/page.tsx", "components/course-detail.tsx", "components/courses-catalogue.tsx", "components/library-page.tsx"];
const DEVELOPER_SPEAK = [
  /locally (stored|presented)/i, /local (course )?(record|page)s?\b/i, /provenance/i, /fabricat/i, /\binferred\b/i,
  /the (public )?source (publishes|does not|highlights)/i, /taken directly from/i, /published (course|topics|certification|local)/i,
  /duration claims/i, /not publicly specified/i, /role-protected/i, /Price unavailable/,
];

for (const file of FILES) {
  test(`${file} has no developer-style wording`, () => {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const pattern of DEVELOPER_SPEAK) {
      const found = text.match(pattern);
      assert.equal(found, null, `${file}: "${found?.[0]}" reads like a developer note, reword it for visitors`);
    }
  });
}

test("the course page no longer ends with a developer disclaimer", () => {
  const text = readFileSync(new URL("../components/course-detail.tsx", import.meta.url), "utf8");
  assert.ok(!text.includes("course-disclosure"));
  assert.ok(!text.includes("source-section-list"));
});

test("price wording is consistent: 'Course fee', matching the catalogue filter", () => {
  const text = readFileSync(new URL("../components/course-detail.tsx", import.meta.url), "utf8");
  assert.ok(!/Course price|Published course price/.test(text));
});
