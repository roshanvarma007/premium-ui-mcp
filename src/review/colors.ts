// Color literal parsing and classification used by review rules.
import { parseHex, rgbToOklch, toHex } from '../a11y/color.js';

export interface ParsedColor {
  hex: string;
  alpha: number;
}

const NAMED: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#FF0000',
  blue: '#0000FF',
  purple: '#800080',
  navy: '#000080',
  cyan: '#00FFFF',
  aqua: '#00FFFF',
  magenta: '#FF00FF',
  fuchsia: '#FF00FF',
  indigo: '#4B0082',
  violet: '#EE82EE',
};

/** CSS color literal regex (hex, rgb/rgba, hsl/hsla). Named colors handled separately. */
export const CSS_COLOR_RE =
  /#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3,4}\b|\b(?:rgba?|hsla?)\(\s*[^)]*\)/g;

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)];
}

/** Parses a CSS color literal. Returns null for anything it does not understand. */
export function parseCssColor(raw: string): ParsedColor | null {
  const s = raw.trim().toLowerCase();
  if (s.startsWith('#')) {
    const hex = s.slice(1);
    if (![3, 4, 6, 8].includes(hex.length)) return null;
    const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
    const rgb = parseHex(`#${full.slice(0, 6)}`);
    if (!rgb) return null;
    const alpha = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
    return { hex: toHex(rgb), alpha };
  }
  if (NAMED[s]) return { hex: NAMED[s]!, alpha: 1 };
  const fn = /^(rgba?|hsla?)\((.*)\)$/.exec(s);
  if (!fn) return null;
  const parts = fn[2]!
    .replace(/\//g, ' ')
    .split(/[\s,]+/)
    .filter(Boolean);
  if (parts.length < 3 || parts.some((p) => p.startsWith('var('))) return null;
  const num = (p: string, scale: number) =>
    p.endsWith('%') ? (Number.parseFloat(p) / 100) * scale : Number.parseFloat(p);
  const alphaPart = parts[3];
  const alpha = alphaPart === undefined ? 1 : clamp(num(alphaPart, 1), 0, 1);
  if (fn[1]!.startsWith('rgb')) {
    const [r, g, b] = parts.slice(0, 3).map((p) => clamp(num(p, 255), 0, 255) / 255);
    if ([r, g, b].some((v) => Number.isNaN(v))) return null;
    return { hex: toHex({ r: r!, g: g!, b: b! }), alpha };
  }
  const h = Number.parseFloat(parts[0]!);
  const sat = clamp(num(parts[1]!, 1), 0, 1);
  const light = clamp(num(parts[2]!, 1), 0, 1);
  if ([h, sat, light].some((v) => Number.isNaN(v))) return null;
  const [r, g, b] = hslToRgb(((h % 360) + 360) % 360, sat, light);
  return { hex: toHex({ r, g, b }), alpha };
}

/** Kotlin Color(0xAARRGGBB) / Color(0xRRGGBB) */
export function parseKotlinColor(hexDigits: string): ParsedColor | null {
  const d = hexDigits.toUpperCase();
  if (d.length === 8) {
    const rgb = parseHex(`#${d.slice(2)}`);
    return rgb ? { hex: toHex(rgb), alpha: Number.parseInt(d.slice(0, 2), 16) / 255 } : null;
  }
  if (d.length === 6) {
    const rgb = parseHex(`#${d}`);
    return rgb ? { hex: toHex(rgb), alpha: 1 } : null;
  }
  return null;
}

/** Android #AARRGGBB / #RRGGBB / #RGB / #ARGB */
export function parseAndroidColor(raw: string): ParsedColor | null {
  const h = raw.replace('#', '').toUpperCase();
  if (h.length === 8) return parseKotlinColor(h);
  if (h.length === 4) {
    const full = [...h].map((c) => c + c).join('');
    return parseKotlinColor(full);
  }
  return parseCssColor(`#${h}`);
}

export interface Hue {
  /** OKLCH hue in degrees, or null for neutrals. */
  hue: number | null;
  chroma: number;
  lightness: number;
}

export function hueOf(hex: string): Hue {
  const rgb = parseHex(hex);
  if (!rgb) return { hue: null, chroma: 0, lightness: 0 };
  const { l, c, h } = rgbToOklch(rgb);
  return { hue: c < 0.04 ? null : h, chroma: c, lightness: l };
}

export type HueFamily =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'pink';

/** Buckets an OKLCH hue into a named family. */
export function hueFamily(hue: number): HueFamily {
  const h = ((hue % 360) + 360) % 360;
  if (h < 20 || h >= 350) return 'pink';
  if (h < 40) return 'red';
  if (h < 60) return 'orange';
  if (h < 80) return 'amber';
  if (h < 110) return 'yellow';
  if (h < 160) return 'green';
  if (h < 185) return 'teal';
  if (h < 220) return 'cyan';
  if (h < 255) return 'blue';
  if (h < 280) return 'indigo';
  if (h < 310) return 'violet';
  if (h < 330) return 'purple';
  return 'pink';
}

/** Families conventionally used for meaning (error, success, warning), not as accents. */
export const SEMANTIC_FAMILIES: ReadonlySet<HueFamily> = new Set([
  'red',
  'orange',
  'amber',
  'yellow',
  'green',
]);

/**
 * Framework defaults and generator favourites that signal "no design decisions were made":
 * Material baseline purple and teal, Android Studio template colors, Tailwind indigo/violet/
 * purple and the slate-900 navy that usually sits behind them.
 */
export const AI_DEFAULT_COLORS: Readonly<Record<string, string>> = {
  '#6200EE': 'Material 2 baseline purple',
  '#3700B3': 'Material 2 baseline purple (variant)',
  '#BB86FC': 'Material 2 dark-theme purple',
  '#03DAC5': 'Material 2 baseline teal',
  '#018786': 'Material 2 baseline teal (variant)',
  '#6750A4': 'Material 3 baseline purple',
  '#D0BCFF': 'Material 3 baseline purple (dark)',
  '#625B71': 'Material 3 baseline secondary',
  '#7D5260': 'Material 3 baseline tertiary',
  '#CCC2DC': 'Android Studio template PurpleGrey80',
  '#EFB8C8': 'Android Studio template Pink80',
  '#6366F1': 'Tailwind indigo-500',
  '#4F46E5': 'Tailwind indigo-600',
  '#4338CA': 'Tailwind indigo-700',
  '#818CF8': 'Tailwind indigo-400',
  '#8B5CF6': 'Tailwind violet-500',
  '#7C3AED': 'Tailwind violet-600',
  '#A855F7': 'Tailwind purple-500',
  '#9333EA': 'Tailwind purple-600',
  '#C084FC': 'Tailwind purple-400',
  '#D946EF': 'Tailwind fuchsia-500',
  '#EC4899': 'Tailwind pink-500',
  '#22D3EE': 'Tailwind cyan-400',
  '#06B6D4': 'Tailwind cyan-500',
  '#0F172A': 'Tailwind slate-900 (navy)',
  '#1E1B4B': 'Tailwind indigo-950 (navy)',
  '#020617': 'Tailwind slate-950 (navy)',
};

/** True for a dark, blue-leaning "navy" background. */
export function isNavy(hex: string): boolean {
  const h = hueOf(hex);
  return h.hue !== null && h.lightness < 0.32 && h.hue >= 230 && h.hue < 285 && h.chroma >= 0.03;
}
