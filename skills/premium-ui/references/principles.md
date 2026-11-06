# Design principles

## Hierarchy

- Decide the one thing each screen is for, and make it the largest or most isolated element.
- Use at most three levels of emphasis per screen: primary (large, strong weight), secondary
  (body), tertiary (small, muted).
- Create emphasis with size, weight and space first. Color comes last, and only the accent.
- One primary (solid accent) button per view. Others are outlined (secondary) or text (tertiary).

## Spacing and layout

- Use only the direction's spacing scale (a 4-based grid). Tight inside groups, generous
  between groups: for example 8 between a label and its field, 24-32 between fields
  groups, 64-96 between page sections.
- Align to a few vertical edges. Left-align text longer than a line. Right-align numbers.
- Constrain reading width: body text about 45-75 characters per line.
- Leave space at the top of a screen before the key element; do not start content at the edge.

## Color

- Tinted neutrals (warm or cool) for backgrounds, surfaces and text; never pure #000 on #FFF.
- Exactly one accent family, for primary actions, selection, focus and key data.
- Semantic colors (success, warning, error) only to communicate meaning, always paired with
  text or an icon.
- Dark mode is its own palette: lift surfaces with lightness, lower accent saturation and
  raise its lightness, avoid pure black.
- Check every new text/background pair with `check_contrast` (4.5:1 body, 3:1 large text and UI).

## Typography

- Use the direction's seven roles only: display, headline, title, body, body-small, label, caption.
- Pair a display face with a quiet body face; never more than two families plus mono.
- Line height around 1.4-1.6 for body, 1.1-1.3 for large display text; slight negative
  tracking on large sizes, slight positive tracking on small labels.
- Tabular numerals wherever numbers are compared or update (money, tables, timers, scores).

## Shape, depth and motion

- At most three radii (sm, md, lg) plus full rounding for chips and avatars.
- Borders first: hairline borders and spacing separate content. Use elevation only for
  overlays and interactive layers, and never colored glows.
- Motion explains change: opacity and transform, the direction's durations and easing, no
  bounce on serious data. Respect reduced motion.

## Content and states

- Write like the product: specific nouns, real numbers, plain verbs. Buttons say what happens
  ("Send $250", "Create invoice"), not "Submit".
- Design empty, loading (skeletons shaped like content), error (what happened plus what to do),
  offline and success states with the same tokens.
- Use one icon set in one style and weight. No emoji as icons.

## Accessibility checklist

- Contrast meets WCAG AA. Focus is always visible.
- Touch targets are at least 48dp on Android and 44px on web.
- Text scales with user settings (sp, rem); layouts survive 200% text.
- Every image has alt text; every icon-only control has a label.
- Color is never the only signal. Animations respect reduced motion.
