// Tailwind class-list scanner (class="..." in HTML, className="..." / className={`...`} in JSX).
import { parseCssColor } from '../colors.js';
import { matches } from '../source.js';
import type { Facts, Occ } from '../types.js';

export interface ClassList {
  file: string;
  line: number;
  tag: string;
  classes: string[];
}

/** Finds class lists with the tag that owns them. */
export function classLists(file: string, code: string): ClassList[] {
  const out: ClassList[] = [];
  const re =
    /<([A-Za-z][\w.]*)[^<>]*?\bclass(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*`([^`]*)`\s*\}|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\})/;
  for (const { m, line } of matches(code, re)) {
    const raw = m[2] ?? m[3] ?? m[4] ?? m[5] ?? m[6] ?? '';
    const classes = raw
      .replace(/\$\{[^}]*\}/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    out.push({ file, line, tag: m[1]!, classes });
  }
  return out;
}

/** Strips variant prefixes: "md:hover:bg-x" -> "bg-x" */
export function base(cls: string): string {
  return cls.slice(cls.lastIndexOf(':') + 1).replace(/^!/, '');
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
export const DEFAULT_PALETTE_RE = new RegExp(
  `^(bg|text|border|ring|from|via|to|fill|stroke|outline|decoration|divide|shadow|accent|caret|placeholder)-(${PALETTE})-(50|[1-9]00|950)(\\/\\d+)?$`,
);

const TEXT_SIZES: Record<string, number> = {
  'text-xs': 12,
  'text-sm': 14,
  'text-base': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
  'text-3xl': 30,
  'text-4xl': 36,
  'text-5xl': 48,
  'text-6xl': 60,
  'text-7xl': 72,
  'text-8xl': 96,
  'text-9xl': 128,
};

const RADII: Record<string, number | 'full'> = {
  'rounded-xs': 2,
  'rounded-sm': 4,
  rounded: 4,
  'rounded-md': 6,
  'rounded-lg': 8,
  'rounded-xl': 12,
  'rounded-2xl': 16,
  'rounded-3xl': 24,
  'rounded-4xl': 32,
  'rounded-full': 'full',
};

const SPACING_PREFIX =
  /^-?(p|px|py|pt|pr|pb|pl|ps|pe|m|mx|my|mt|mr|mb|ml|ms|me|gap|gap-x|gap-y|space-x|space-y)-/;

export interface TailwindScanOptions {
  /** Theme color tokens (name -> hex) from --color-* definitions, for contrast checks. */
  themeColors: Map<string, string>;
  /** Allowed numeric spacing names when a direction is known (e.g. 0,1,2,3,4,6,8,12,16,24). */
  spacingNames?: Set<string> | undefined;
  spacingBase: number;
  hasDirection: boolean;
}

export function scanTailwind(lists: ClassList[], facts: Facts, o: TailwindScanOptions): void {
  for (const list of lists) {
    const at = (raw: string): Occ => ({ file: list.file, line: list.line, raw });
    const bases = list.classes.map(base);
    if (bases.some((c) => /^bg-(gradient|linear|radial|conic)(-|$)/.test(c))) {
      facts.gradients.push(
        at(
          list.classes
            .filter((c) => /gradient|linear|radial|conic|^(from|via|to)-/.test(base(c)))
            .join(' '),
        ),
      );
    }
    for (const c of bases) {
      if (/^backdrop-blur/.test(c)) facts.glass.push(at(c));
      if (
        /^shadow-\[[^\]]*(#|rgb|hsl)/.test(c) ||
        /^shadow-(?!sm$|md$|lg$|xl$|2xl$|none$|inner$|xs$)[a-z]+-\d{2,3}(\/\d+)?$/.test(c)
      ) {
        facts.glows.push(at(c));
      } else if (/^shadow(-(sm|md|lg|xl|2xl|xs))?$/.test(c)) {
        facts.shadows.push(at(c));
      }
      const arbColor = /^[a-z-]+-\[(#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\)|hsla?\([^\]]*\))\]$/.exec(c);
      if (arbColor) {
        const parsed = parseCssColor(arbColor[1]!.replace(/_/g, ' '));
        if (parsed) {
          facts.colors.push({ ...at(c), hex: parsed.hex, alpha: parsed.alpha });
          facts.allColors.push({
            ...at(c),
            hex: parsed.hex,
            alpha: parsed.alpha,
            tokenFile: false,
          });
        }
      }
      if (TEXT_SIZES[c] !== undefined) facts.fontSizes.push({ ...at(c), px: TEXT_SIZES[c]! });
      const arbSize = /^text-\[(\d*\.?\d+)(px|rem)\]$/.exec(c);
      if (arbSize) {
        const px = Number.parseFloat(arbSize[1]!) * (arbSize[2] === 'rem' ? 16 : 1);
        facts.fontSizes.push({ ...at(c), px });
      }
      if (RADII[c] !== undefined) facts.radii.push({ ...at(c), px: RADII[c]! });
      const arbRadius = /^rounded(?:-[a-z]+)?-\[(\d*\.?\d+)px\]$/.exec(c);
      if (arbRadius) facts.radii.push({ ...at(c), px: Number.parseFloat(arbRadius[1]!) });
      if (SPACING_PREFIX.test(c)) {
        const arb = /-\[(\d*\.?\d+)(px|rem)\]$/.exec(c);
        if (arb) {
          const px = Number.parseFloat(arb[1]!) * (arb[2] === 'rem' ? 16 : 1);
          if (px !== 0) facts.spacing.push({ ...at(c), px });
        } else if (o.spacingNames) {
          const n = /-(\d+(?:\.\d+)?)$/.exec(c)?.[1];
          if (n !== undefined && !o.spacingNames.has(n)) {
            facts.spacing.push({ ...at(c), px: Number.parseFloat(n) * o.spacingBase + 0.001 });
          }
        }
      }
      if (o.hasDirection && /^font-(sans|serif)$/.test(c)) facts.defaultFonts.push(at(c));
    }
    // Touch targets on interactive elements.
    if (/^(button|a|Link|Button)$/.test(list.tag)) {
      for (const c of bases) {
        const h = /^(h|min-h|size)-(\d+(?:\.\d+)?)$/.exec(c);
        if (h) facts.touchTargets.push({ ...at(c), px: Number.parseFloat(h[2]!) * o.spacingBase });
        const arb = /^(h|min-h|size)-\[(\d+)px\]$/.exec(c);
        if (arb) facts.touchTargets.push({ ...at(c), px: Number.parseFloat(arb[2]!) });
      }
    }
    // Text on background pairs resolvable from theme tokens or arbitrary colors.
    const colorOf = (prefix: 'text' | 'bg') => {
      for (const c of bases) {
        if (!c.startsWith(`${prefix}-`)) continue;
        const name = c.slice(prefix.length + 1);
        const arb = /^\[(#[0-9a-fA-F]{3,8})\]$/.exec(name);
        if (arb) return parseCssColor(arb[1]!)?.hex;
        if (name === 'black') return '#000000';
        if (name === 'white') return '#FFFFFF';
        const hex = o.themeColors.get(name);
        if (hex) return hex;
      }
      return undefined;
    };
    const fg = colorOf('text');
    const bg = colorOf('bg');
    if (fg && bg) {
      facts.textOnBackground.push({ ...at(list.classes.join(' ')), fg, bg });
    }
  }
}
