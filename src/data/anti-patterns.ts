// The "never do this" list. Each entry links to the review_ui rule ids that detect it.
import type { PlatformId } from '../platforms.js';

export interface AntiPattern {
  id: string;
  title: string;
  why: string;
  instead: string;
  rules: string[];
  /** Platform-specific tells. Omitted platforms use the general description. */
  looks_like?: Partial<Record<PlatformId, string>>;
}

export const ANTI_PATTERNS: readonly AntiPattern[] = [
  {
    id: 'gradients',
    title: 'Decorative gradients',
    why: 'Purple-to-blue and indigo-to-pink gradients are the strongest single tell of AI-generated UI and make every product look the same.',
    instead:
      'Use flat surfaces from the direction palette. Create emphasis with size, weight and whitespace.',
    rules: ['gradient-usage'],
    looks_like: {
      html: 'background: linear-gradient(...) / radial-gradient(...)',
      tailwind: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
      react: "style={{ background: 'linear-gradient(...)' }}",
      nextjs: 'linear-gradient in globals.css or inline styles',
      compose: 'Brush.linearGradient / Brush.verticalGradient as a background',
      'android-xml': '<gradient> inside a shape drawable',
    },
  },
  {
    id: 'glassmorphism',
    title: 'Glassmorphism and blur',
    why: 'Frosted translucent panels hurt legibility, cost GPU time, and read as a template.',
    instead: 'Use opaque surface and surface_alt tokens separated by a hairline border.',
    rules: ['glassmorphism'],
    looks_like: {
      html: 'backdrop-filter: blur(...) with rgba(255,255,255,0.1) fills',
      tailwind: 'backdrop-blur-xl bg-white/10',
      compose: 'Modifier.blur() over translucent Color(0x33FFFFFF)',
      'android-xml': 'RenderEffect blur or translucent #33FFFFFF backgrounds',
    },
  },
  {
    id: 'glow-shadows',
    title: 'Glow shadows',
    why: 'Colored, large-blur shadows imitate neon and pull focus from content.',
    instead:
      'Follow the direction elevation levels. Most directions prefer borders first and a soft neutral shadow only for overlays.',
    rules: ['glow-shadow', 'shadow-everywhere'],
    looks_like: {
      html: 'box-shadow: 0 0 40px rgba(99, 102, 241, 0.6)',
      tailwind: 'shadow-[0_0_40px_rgba(99,102,241,0.6)] or shadow-indigo-500/50',
      compose: 'Modifier.shadow(..., spotColor = accent)',
    },
  },
  {
    id: 'ai-palette',
    title: 'Default AI palette',
    why: 'Navy or near-black backgrounds with cyan and purple accents, or untouched framework defaults (Material purple #6200EE, Tailwind indigo), signal "no design decisions were made".',
    instead:
      'Use the palette of the chosen direction: tinted neutrals and exactly one accent family.',
    rules: ['ai-palette', 'too-many-accents'],
  },
  {
    id: 'emoji-icons',
    title: 'Emoji as icons',
    why: 'Emoji render differently on every platform, cannot be themed, and look unfinished.',
    instead:
      'Use one icon set in one style (the direction lists recommended sets), sized on the spacing grid.',
    rules: ['emoji-as-icon'],
  },
  {
    id: 'shadow-everywhere',
    title: 'Shadow on every card',
    why: 'When everything floats, nothing does. Hierarchy flattens and the UI looks noisy.',
    instead:
      'Separate with spacing and hairline borders. Reserve elevation for interactive or overlay layers.',
    rules: ['shadow-everywhere'],
  },
  {
    id: 'pill-everything',
    title: 'Everything fully rounded',
    why: 'Uniform giant radii make containers, buttons and inputs indistinguishable.',
    instead:
      'Use at most 3 radii from the direction (sm, md, lg) and keep full rounding for chips and avatars.',
    rules: ['uniform-pill-everything', 'radius-sprawl'],
  },
  {
    id: 'type-sprawl',
    title: 'Random font sizes',
    why: 'More than about 7 sizes means there is no type system, so hierarchy becomes guesswork.',
    instead:
      'Use only the 7 roles of the direction scale (display, headline, title, body, body_small, label, caption).',
    rules: ['font-size-sprawl', 'tiny-text'],
  },
  {
    id: 'off-grid-spacing',
    title: 'Off-grid spacing',
    why: 'Values like 13px, 15px and 22px break the rhythm that makes layouts feel calm.',
    instead: 'Use only spacing tokens from the direction scale (a 4-based grid).',
    rules: ['off-grid-spacing'],
  },
  {
    id: 'default-fonts',
    title: 'Default fonts left in place',
    why: 'Inter or Roboto everywhere is the typographic equivalent of the default palette.',
    instead: 'Wire up the direction display and body families with their fallbacks.',
    rules: ['default-font-fallthrough'],
  },
  {
    id: 'hardcoded-values',
    title: 'Hardcoded colors and sizes in screen code',
    why: 'Literals drift from the system, break dark mode and make restyling impossible.',
    instead:
      'Reference generated tokens only: CSS variables, Tailwind theme keys, Compose theme values or XML resources.',
    rules: ['hardcoded-color'],
  },
  {
    id: 'pure-black-white',
    title: 'Pure black on pure white',
    why: 'Maximum contrast causes glare and feels harsh, especially in dark mode.',
    instead: 'Use the direction text and bg tokens: tinted near-black on warm or cool off-white.',
    rules: ['pure-black-white'],
  },
  {
    id: 'inaccessible',
    title: 'Low contrast, tiny text, small touch targets',
    why: 'Fails WCAG and real users. Grey-on-grey "elegance" is not premium.',
    instead:
      'Keep text at 4.5:1, at least 12px/sp, and touch targets of 48dp on Android or 44px on web.',
    rules: ['contrast-fail', 'tiny-text', 'low-touch-target'],
  },
  {
    id: 'generic-copy',
    title: 'Generic hero copy and lorem ipsum',
    why: 'Copy like "Welcome to the future of X" and "Unlock your potential" makes a screen look fake no matter how it is styled.',
    instead:
      'Write realistic, specific copy: what it is, who it is for, what happens next. Use plausible data.',
    rules: [],
  },
  {
    id: 'missing-states',
    title: 'Only the happy path',
    why: 'Real products show empty, loading, error, offline and success states. Leaving them out shows an unfinished product.',
    instead:
      'Design each state with the same tokens and tone. Use skeletons sized like real content.',
    rules: [],
  },
  {
    id: 'many-primaries',
    title: 'Several primary buttons on one view',
    why: 'Competing calls to action leave the user unsure what to do.',
    instead:
      'Use one primary action per view. Everything else is secondary (outlined) or tertiary (text).',
    rules: [],
  },
];

export function antiPatternsFor(
  platform?: PlatformId,
): Array<Omit<AntiPattern, 'looks_like'> & { looks_like?: string }> {
  return ANTI_PATTERNS.map(({ looks_like, ...rest }) => {
    const tell = platform ? looks_like?.[platform] : undefined;
    return tell ? { ...rest, looks_like: tell } : rest;
  });
}
