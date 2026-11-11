import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cleanSummaryText, firstSentence } from "../lib/clean-text.ts";

const summaries = JSON.parse(readFileSync(new URL("../data/dentomax-academy-course-summaries.json", import.meta.url), "utf8"));

test("first sentence of a summary", () => {
  assert.equal(firstSentence("One sentence here. Another one follows."), "One sentence here.");
  assert.equal(firstSentence("Only one sentence."), "Only one sentence.");
  assert.equal(firstSentence("No full stop at the end"), "No full stop at the end");
  assert.equal(firstSentence("Fee is 1.5 lakh. Next."), "Fee is 1.5 lakh.");
});

for (const summary of summaries) {
  test(`${summary.slug}: card text is one complete sentence`, () => {
    const { shortDescription } = cleanSummaryText(summary);
    const card = firstSentence(shortDescription);
    assert.match(card, /[.!?]$/, "card text must end at the end of a sentence");
    assert.ok(card.length >= 80 && card.length <= 260, `length ${card.length}`);
    assert.ok(shortDescription.startsWith(card));
  });
}
