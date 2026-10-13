import type { PromptSkill } from './types';

/*
 * Loaded whenever the user attaches a design reference (the chat adds a
 * "[Design reference attached …]" note with sampled colors — see utils/reference-image.ts).
 * The goal is a faithful recreation of the screenshot, not something "inspired by" it.
 */
export const designReferenceSkill: PromptSkill = {
  name: 'design-reference',
  description: 'Recreating a website faithfully from an uploaded screenshot or design image.',
  triggers: /design reference attached/,
  forceTriggers: /design reference attached/,
  body: () => `
<design_reference_skill>
  The user attached a design reference (screenshot or mockup). Build a FAITHFUL recreation: same
  sections in the same order, same text, same colors, same typography, same proportions. Not a
  re-imagining and not "inspired by". The images stay attached for follow-up messages.

  ## STEP 1 — Analyse before coding
  Before the artifact, write a compact analysis (bullet list, no fluff):
  - Sections top to bottom (nav, hero, logo strip, features, testimonials, pricing, CTA, footer…), each
    with its layout: number of columns, alignment, background, what sits left/right.
  - Exact copy: transcribe every heading, paragraph, nav item, button label, stat and footer link
    verbatim. Never substitute lorem ipsum or your own wording.
  - Colors: the message lists colors SAMPLED FROM THE PIXELS with their share of the image. Use those
    exact hex values — they are more accurate than eyeballing. Assign roles: page background,
    alternate section background, card/surface, primary text, muted text, brand/accent, borders.
    Small accents (buttons, links) can be under 1% — look for them in the image.
  - Typography: serif / sans / display / mono, the closest Google Font (e.g. Inter, Manrope, Poppins,
    DM Sans, Space Grotesk, Playfair Display, DM Serif Display, Fraunces), and per text level its size
    (relative to the design width), weight, letter-spacing, line-height and casing.
  - Spacing & shapes: container max-width, section vertical padding, gaps, card padding, border
    radius, shadows, border widths, divider lines.
  - Imagery & icons: what each image shows, its aspect ratio and position; icon style (outline/filled).

  If the overview and the detail slices disagree, trust the slices for text and sizes.

  ## STEP 2 — Encode the design system first
  In src/styles.css add an @theme block with the palette (e.g. --color-page, --color-surface,
  --color-ink, --color-muted, --color-brand, --color-line) and fonts (--font-sans, --font-display).
  Load the fonts with Google Fonts <link> entries in the root route's head links. Use only these
  tokens in components (bg-page, text-ink, font-display…), never ad-hoc colors.

  ## STEP 3 — Build section by section, in order
  One component per section in src/components/sections/, composed in the page route. Match:
  - layout proportions: column ratios, image vs text width, alignment, overlaps;
  - relative type scale: if a heading is 3× the body size in the reference, keep it 3×;
  - spacing rhythm and container width (assume the reference is ~1440px wide unless its size says
    otherwise, and convert proportionally);
  - exact copy, button labels and button styles (filled/outline, radius, padding).
  Then make it responsive: columns stack on mobile, type scales down, nothing overflows.

  ## Images and icons
  - NEVER place the reference screenshot itself on the site.
  - Photos in the design: use the AI-generated images listed in the message (a hosted https:// URL or a
    /generated/ path) — those were created from the reference via image-to-image and MUST fill the
    matching slots. Then the user's uploaded assets. Do not replace them with Unsplash/Pexels/picsum.
    Only if a slot has no generated image and no upload, use a same-aspect-ratio placeholder
    (e.g. https://picsum.photos/seed/<keyword>/<width>/<height>) styled to match.
  - Logos: recreate as text in the right font/weight, or a simple inline SVG.
  - Icons: lucide-react (npm install lucide-react), matching outline/filled style and size.

  ## Several reference images
  They may be different pages (one route each) or sections of one long page. If it is unclear which,
  ask before building.

  ## STEP 4 — Check before finishing
  Compare your result with the reference section by section: order, text, colors, fonts, sizes,
  spacing, alignment, radii. Fix differences before you finish. In the final message, list any
  deliberate deviations (e.g. a font that isn't on Google Fonts and the substitute used).

  For follow-ups like "make it closer to the design", re-read the attached reference and fix the
  specific mismatches with edit actions instead of rewriting everything.
</design_reference_skill>
`,
};
