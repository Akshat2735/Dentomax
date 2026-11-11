// Locks in the colour pairs chosen in app/accessibility.css (WCAG AA: 4.5:1 normal text, 3:1 for outlines).
// Backgrounds are the LIGHTEST/DARKEST realistic colour behind the text, i.e. the worst case.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const channel = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const ratio = (a, b) => { const x = luminance(hex(a)), y = luminance(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

const PAIRS = [
  // [what, text, background, minimum]
  ["small teal labels (eyebrows) on the cream panels", "#1f5f5e", "#dfe4d5", 4.5],
  ["muted label on the fee card", "#4a5d5e", "#eaf6f1", 4.5],
  ["enquiry note on the fee card", "#4d5f60", "#eaf6f1", 4.5],
  ["filter panel labels", "#455a5d", "#e9e8e2", 4.5],
  ["course section tabs", "#2f4f5a", "#e6e2d6", 4.5],
  ["journey step numbers", "#7a5a2d", "#e5eee6", 4.5],
  ["journey step text", "#4a5f62", "#e5eee6", 4.5],
  ["sign-up hints on the form", "#566274", "#ffffff", 4.5],
  ["placeholder text", "#6b7788", "#ffffff", 4.5],
  ["light text on the (solid) sign-up panel, lightest end of its gradient", "#e6f0ee", "#205c5d", 4.5],
  ["footer brand sub-label", "#a9c6bf", "#183736", 4.5],
  ["book spine labels on the home page", "#fff8ea", "#88623f", 4.5],
  ["form field outline", "#7a8797", "#ffffff", 3],
  ["keyboard focus ring on light", "#1d7474", "#ffffff", 3],
  ["keyboard focus ring on dark sections", "#f0d199", "#102c31", 3],
];

for (const [what, fg, bg, min] of PAIRS) {
  test(`${what}: ${fg} on ${bg} is at least ${min}:1`, () => {
    const r = ratio(fg, bg);
    assert.ok(r >= min, `${r.toFixed(2)}:1`);
  });
}

test("every colour used in the pairs above is actually in accessibility.css", () => {
  const css = readFileSync(new URL("../app/accessibility.css", import.meta.url), "utf8").toLowerCase();
  for (const [what, fg] of PAIRS) assert.ok(css.includes(fg.toLowerCase()), `${what}: ${fg} not found in accessibility.css`);
});
