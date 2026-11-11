// The course text was copied from a WordPress site that used a page builder, and a few leftovers of its
// shortcodes survive in the headings, e.g.
//   Main Features:” font_container=”tag:h4|text_align:left” google_fonts=”font_family:Montserrat…”]
// Left alone, that unbreakable string is shown to visitors and (on phones) stretches the whole page
// sideways. This keeps only the readable label ("Main Features:").

const SHORTCODE_ATTRIBUTES = /[\s”“"']*\b(?:font_container|google_fonts|use_theme_fonts|text_align|el_class|css_animation)\s*=[\s\S]*$/i;
const INVISIBLE_CHARACTERS = /[​-‍⁠﻿]/g;

export function cleanHeading(value: string): string {
  return value
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(SHORTCODE_ATTRIBUTES, "")
    .replace(/[\]”“"']+\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}
