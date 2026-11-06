// Shared CSS custom-property output for the whole web family (html, tailwind, react, nextjs).
// Variable names follow Tailwind v4 theme namespaces (--color-*, --font-*, --text-*,
// --spacing-*, --radius-*, --shadow-*, --ease-*), so the same tokens drive plain CSS and
// Tailwind utilities without duplication.
import type { Direction } from '../../schema/direction.schema.js';
import {
  type FamilyKey,
  generatedHeader,
  kebab,
  num,
  PALETTE_KEYS,
  type ResolvedPalette,
  resolvePalette,
  spacingTokens,
  typeRoles,
} from '../model.js';
import type { AdapterOptions } from '../types.js';

const BASE_PX = 16;
const FLUID_MIN_VW = 360;
const FLUID_MAX_VW = 1280;

const COLOR_KEYS = [...PALETTE_KEYS, 'on_success', 'on_warning', 'on_error'] as const;

export const rem = (px: number): string => (px === 0 ? '0' : `${num(px / BASE_PX)}rem`);

/** clamp() that grows linearly from min at 360px to max at 1280px viewport width. */
export function fluid(minPx: number, maxPx: number): string {
  const slope = (maxPx - minPx) / (FLUID_MAX_VW - FLUID_MIN_VW);
  const interceptPx = minPx - slope * FLUID_MIN_VW;
  return `clamp(${rem(minPx)}, ${num(interceptPx / BASE_PX)}rem + ${num(slope * 100)}vw, ${rem(maxPx)})`;
}

export function fontStack(name: string, fallback: string[]): string {
  const q = (f: string) => (/^[\w-]+$/.test(f) && !/\d/.test(f[0] ?? '') ? f : `"${f}"`);
  return [`"${name}"`, ...fallback.map(q)].join(', ');
}

/** var(--spacing-N) for the scale value nearest to `px` (ties go to the smaller value). */
export function spacingVar(d: Direction, px: number): string {
  const tokens = spacingTokens(d);
  let best = tokens[0]!;
  for (const t of tokens) {
    if (Math.abs(t.value - px) < Math.abs(best.value - px)) best = t;
  }
  return `var(--spacing-${best.name})`;
}

export function familyVar(key: FamilyKey): string {
  return `--font-${key}`;
}

function colorVars(p: ResolvedPalette, indent: string): string {
  return COLOR_KEYS.map((k) => `${indent}--color-${kebab(k)}: ${p[k]};`).join('\n');
}

function shadowVars(d: Direction, dark: boolean, indent: string): string {
  return d.elevation.levels
    .filter((l) => l.shadow)
    .map(
      (l) =>
        `${indent}--shadow-${kebab(l.name)}: ${(dark ? l.shadow_dark : undefined) ?? l.shadow};`,
    )
    .join('\n');
}

/** Static (mode-independent) tokens: fonts, type scale, spacing, radii, motion. */
/**
 * Maps a font family name to a CSS variable holding the real family (for next/font, whose
 * family names are hashed). Without it the family name is used directly.
 */
export type FontVarFor = (familyName: string) => string | undefined;

function stackFor(name: string, fallback: string[], fontVar?: FontVarFor): string {
  const v = fontVar?.(name);
  if (!v) return fontStack(name, fallback);
  return [`var(${v})`, ...fontStack(name, fallback).split(', ').slice(1)].join(', ');
}

function staticVars(d: Direction, indent: string, fontVar?: FontVarFor): string {
  const t = d.typography;
  const lines: string[] = [];
  const mono = t.mono_family ?? t.body_family;
  lines.push(`${indent}/* Font families */`);
  lines.push(
    `${indent}--font-display: ${stackFor(t.display_family.name, t.display_family.fallback, fontVar)};`,
  );
  lines.push(
    `${indent}--font-body: ${stackFor(t.body_family.name, t.body_family.fallback, fontVar)};`,
  );
  lines.push(`${indent}--font-mono: ${stackFor(mono.name, mono.fallback, fontVar)};`);

  lines.push('', `${indent}/* Type scale: size, line height, letter spacing, weight per role */`);
  for (const { role, style } of typeRoles(d)) {
    const name = kebab(role);
    const range = t.web_responsive?.[role];
    const size = range ? fluid(range.min, range.max) : rem(style.size);
    lines.push(`${indent}--text-${name}: ${size};`);
    lines.push(`${indent}--text-${name}--line-height: ${num(style.line_height / style.size)};`);
    lines.push(`${indent}--text-${name}--letter-spacing: ${num(style.letter_spacing)}em;`);
    lines.push(`${indent}--text-${name}--font-weight: ${style.weight};`);
  }

  lines.push('', `${indent}/* Spacing (${d.spacing.base}px grid; name = multiples of the base) */`);
  for (const s of spacingTokens(d)) lines.push(`${indent}--spacing-${s.name}: ${rem(s.value)};`);

  lines.push('', `${indent}/* Radii. ${d.radius.usage} */`);
  for (const k of ['sm', 'md', 'lg'] as const)
    lines.push(`${indent}--radius-${k}: ${rem(d.radius[k])};`);
  lines.push(`${indent}--radius-full: 9999px;`);

  const [x1, y1, x2, y2] = d.motion.easing.match(/-?[\d.]+/g)!.map(Number);
  lines.push('', `${indent}/* Motion */`);
  lines.push(
    `${indent}--ease-standard: cubic-bezier(${num(x1!)}, ${num(y1!)}, ${num(x2!)}, ${num(y2!)});`,
  );
  lines.push(`${indent}--duration-fast: ${d.motion.duration_ms.fast}ms;`);
  lines.push(`${indent}--duration-base: ${d.motion.duration_ms.base}ms;`);
  lines.push(`${indent}--duration-slow: ${d.motion.duration_ms.slow}ms;`);

  lines.push('', `${indent}/* Accessibility */`);
  lines.push(`${indent}--size-touch: 2.75rem; /* 44px minimum target */`);
  return lines.join('\n');
}

/**
 * tokens.css: light/dark color tokens switched by the data-theme attribute on <html>,
 * with prefers-color-scheme as the no-JavaScript fallback.
 */
export function tokensCss(
  d: Direction,
  o: Pick<AdapterOptions, 'mode'>,
  fontVar?: FontVarFor,
): string {
  const light = resolvePalette(d.color.light);
  const dark = resolvePalette(d.color.dark);
  const i1 = '  ';
  const i2 = '    ';
  const parts: string[] = [
    generatedHeader(d, '/*')
      .replace(/\n\/\*/g, '\n *')
      .concat('\n */'),
  ];

  if (o.mode === 'dark') {
    parts.push(
      `:root {\n${i1}color-scheme: dark;\n${colorVars(dark, i1)}\n${shadowVars(d, true, i1)}\n\n${staticVars(d, i1, fontVar)}\n}`,
    );
    return `${parts.join('\n\n')}\n`;
  }

  parts.push(
    `:root {\n${i1}color-scheme: ${o.mode === 'both' ? 'light dark' : 'light'};\n${colorVars(light, i1)}\n${shadowVars(d, false, i1)}\n\n${staticVars(d, i1, fontVar)}\n}`,
  );
  if (o.mode === 'both') {
    const darkBlock = (indent: string) =>
      `${indent}color-scheme: dark;\n${colorVars(dark, indent)}\n${shadowVars(d, true, indent)}`;
    parts.push(
      `/* Dark theme: explicit choice via <html data-theme="dark"> */\n:root[data-theme='dark'] {\n${darkBlock(i1)}\n}`,
      `/* No JavaScript and no explicit choice: follow the system setting */\n@media (prefers-color-scheme: dark) {\n  :root:not([data-theme]) {\n${darkBlock(i2)}\n  }\n}`,
      `:root[data-theme='light'] {\n${i1}color-scheme: light;\n}`,
    );
  }
  return `${parts.join('\n\n')}\n`;
}

export interface WebFontFile {
  family: string;
  weight: number;
  file: string;
}

/** Self-hosted woff2 files, one per family and weight: /fonts/manrope-400.woff2 */
export function webFontFiles(d: Direction): WebFontFile[] {
  const seen = new Set<string>();
  const out: WebFontFile[] = [];
  const fams = [d.typography.display_family, d.typography.body_family, d.typography.mono_family];
  for (const f of fams) {
    if (!f) continue;
    for (const w of [...f.weights].sort((a, b) => a - b)) {
      const key = `${f.name}:${w}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const slug = f.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      out.push({ family: f.name, weight: w, file: `${slug}-${w}.woff2` });
    }
  }
  return out;
}

/** @font-face rules for self-hosted fonts. `urlPrefix` is where the woff2 files are served. */
export function fontFaceCss(d: Direction, urlPrefix: string): string {
  const faces = webFontFiles(d).map(
    (f) =>
      `@font-face {\n  font-family: "${f.family}";\n  font-style: normal;\n  font-weight: ${f.weight};\n  font-display: swap;\n  src: url("${urlPrefix}${f.file}") format("woff2");\n}`,
  );
  return `${generatedHeader(d, '/*').replace(/\n\/\*/g, '\n *')}\n * Self-hosted fonts (no third-party requests). Put the woff2 files in ${urlPrefix}\n */\n\n${faces.join('\n\n')}\n`;
}

/** Google Fonts css2 URL for the direction's families and weights (opt-in only). */
export function googleFontsUrl(d: Direction): string {
  const byName = new Map<string, Set<number>>();
  for (const f of webFontFiles(d)) {
    const set = byName.get(f.family) ?? new Set<number>();
    set.add(f.weight);
    byName.set(f.family, set);
  }
  const params = [...byName.entries()].map(
    ([name, weights]) =>
      `family=${name.replace(/ /g, '+')}:wght@${[...weights].sort((a, b) => a - b).join(';')}`,
  );
  return `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
}

/** Inline, render-blocking snippet that sets data-theme before first paint (no flash). */
export const NO_FLASH_SNIPPET =
  "(function(){try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();";

/** Typography role classes (.t-display, .t-body, ...) using the tokens. */
export function roleClassesCss(d: Direction): string {
  return typeRoles(d)
    .map(({ role, family }) => {
      const n = kebab(role);
      return `.t-${n} {\n  font-family: var(--font-${family});\n  font-size: var(--text-${n});\n  line-height: var(--text-${n}--line-height);\n  letter-spacing: var(--text-${n}--letter-spacing);\n  font-weight: var(--text-${n}--font-weight);\n}`;
    })
    .join('\n\n');
}

export function themeColorMeta(d: Direction, mode: AdapterOptions['mode']): string[] {
  if (mode === 'light') return [`<meta name="theme-color" content="${d.color.light.bg}">`];
  if (mode === 'dark') return [`<meta name="theme-color" content="${d.color.dark.bg}">`];
  return [
    `<meta name="theme-color" media="(prefers-color-scheme: light)" content="${d.color.light.bg}">`,
    `<meta name="theme-color" media="(prefers-color-scheme: dark)" content="${d.color.dark.bg}">`,
  ];
}
