import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanHeading } from "../lib/clean-text.ts";

const JUNK = /font_container|google_fonts|use_theme_fonts|text_align|el_class|css_animation|\bvc_[a-z_]+|[a-z_]{4,}=[”“"]/i;

test("strips the page-builder tail from a heading", () => {
  const raw = "Main Features:” font_container=”tag:h4|text_align:left” google_fonts=”font_family:Montserrat%3Aregular%2C700|font_style:400%20regular%3A400%3Anormal”]";
  assert.equal(cleanHeading(raw), "Main Features:");
});
test("leaves normal headings alone", () => {
  for (const h of ["Key Highlights:", "Eligibility Criteria", "MBBS / BAMS / BUMS / BHMS & BDS", "IEB – International Education Board, UK", "Duration: 6 Months"]) assert.equal(cleanHeading(h), h);
});
test("removes invisible zero-width characters so duplicates collapse", () => {
  assert.equal(cleanHeading("Certification ​"), "Certification");
});
test("no section heading in the real course data contains page-builder junk after cleaning", () => {
  const courses = JSON.parse(readFileSync(new URL("../data/dentomax-academy-courses.json", import.meta.url), "utf8"));
  let checked = 0;
  for (const c of courses) for (const h of [...c.headings, ...c.emphasizedHeadings]) {
    checked++;
    const cleaned = cleanHeading(h);
    assert.ok(!JUNK.test(cleaned), `${c.slug}: "${cleaned}"`);
    assert.ok(cleaned.length <= 120, `${c.slug}: heading too long (${cleaned.length})`);
  }
  assert.ok(checked > 100);
});
