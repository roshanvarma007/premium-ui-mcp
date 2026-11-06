// CSS declaration scanner. Used for .css files, HTML <style> blocks and style attributes, and
// CSS-in-JS template literals.
import { CSS_COLOR_RE, hueOf, parseCssColor } from '../colors.js';
import { lineAt } from '../source.js';
import type { Facts } from '../types.js';

export interface Decl {
  prop: string;
  value: string;
  line: number;
  /** Selector of the enclosing rule, if known. */
  selector: string;
}

/** Splits CSS text into declarations with their selector and line. Nested blocks supported. */
export function declarations(css: string, baseLine = 1): Decl[] {
  const out: Decl[] = [];
  const stack: string[] = [];
  let i = 0;
  let start = 0;
  const flush = (end: number) => {
    const chunk = css.slice(start, end);
    const re = /(--[\w-]+|[a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?:;|$)/g;
    for (let m = re.exec(chunk); m; m = re.exec(chunk)) {
      if (/^[a-z-]+$/i.test(m[1]!) || m[1]!.startsWith('--')) {
        const offset = start + m.index;
        out.push({
          prop: m[1]!.toLowerCase(),
          value: m[2]!.trim(),
          line: baseLine + lineAt(css, offset) - 1,
          selector: stack[stack.length - 1] ?? '',
        });
      }
    }
  };
  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const selector = css.slice(start, i).split(/[;}]/).pop()!.trim();
      stack.push(selector);
      start = i + 1;
    } else if (ch === '}') {
      flush(i);
      stack.pop();
      start = i + 1;
    } else if (ch === ';' && stack.length === 0) {
      start = i + 1;
    }
    i++;
  }
  flush(css.length);
  return out;
}

/** Converts a CSS length literal to px (rem/em at 16px). null for var(), calc(), %, etc. */
export function toPx(value: string): number | null {
  const m = /^(-?\d*\.?\d+)(px|rem|em)?$/.exec(value.trim());
  if (!m) return null;
  const n = Number.parseFloat(m[1]!);
  if (m[2] === 'rem' || m[2] === 'em') return n * 16;
  if (m[2] === 'px' || n === 0) return n;
  return null;
}

const SPACING_PROPS =
  /^(margin|padding|gap|row-gap|column-gap|margin-(top|right|bottom|left|inline|block)(-start|-end)?|padding-(top|right|bottom|left|inline|block)(-start|-end)?)$/;
const DEFAULT_FONTS = /^["']?(inter|roboto|arial|helvetica|helvetica neue)["']?$/i;
const GENERIC_FONTS = /^["']?(system-ui|sans-serif|serif|-apple-system|ui-sans-serif)["']?$/i;

export interface CssScanOptions {
  file: string;
  tokenFile: boolean;
  hasDirection: boolean;
  /** Resolves var(--x) to a literal color when the tokens are known. */
  resolveVar: (name: string) => string | undefined;
}

function resolveColor(value: string, o: CssScanOptions): string | undefined {
  const v = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim());
  if (v) return o.resolveVar(v[1]!);
  const c = parseCssColor(value);
  return c && c.alpha === 1 ? c.hex : undefined;
}

/** Adds facts from CSS declarations. */
export function scanCss(decls: Decl[], facts: Facts, o: CssScanOptions): void {
  const bySelector = new Map<string, Decl[]>();
  for (const d of decls) {
    const list = bySelector.get(`${d.selector}@${d.line}`) ?? [];
    list.push(d);
    bySelector.set(`${d.selector}@${d.line}`, list);
    const raw = `${d.prop}: ${d.value}`;
    const at = { file: o.file, line: d.line, raw };
    const isCustomProp = d.prop.startsWith('--');

    for (const m of d.value.matchAll(CSS_COLOR_RE)) {
      const c = parseCssColor(m[0]);
      if (!c) continue;
      facts.allColors.push({
        ...at,
        raw: m[0],
        hex: c.hex,
        alpha: c.alpha,
        tokenFile: o.tokenFile,
      });
      if (!o.tokenFile && !isCustomProp)
        facts.colors.push({ ...at, raw: m[0], hex: c.hex, alpha: c.alpha });
    }
    if (o.tokenFile || isCustomProp) continue;

    if (/(linear|radial|conic)-gradient\(/.test(d.value) && d.prop !== 'mask-image') {
      facts.gradients.push(at);
    }
    if (/^(-webkit-)?backdrop-filter$/.test(d.prop) && /blur\(/.test(d.value)) facts.glass.push(at);
    if (d.prop === 'box-shadow' && !/^(none|var\()/.test(d.value)) {
      const isRing = /^(inset\s+)?0(px)?\s+0(px)?\s+0(px)?\s+\d/.test(d.value);
      if (!isRing) facts.shadows.push(at);
      for (const shadow of d.value.split(/,(?![^(]*\))/)) {
        const color = [...shadow.matchAll(CSS_COLOR_RE)][0]?.[0];
        const parsed = color ? parseCssColor(color) : null;
        const lengths = (shadow.replace(CSS_COLOR_RE, '').match(/-?\d*\.?\d+(px|rem)?/g) ?? []).map(
          (v) => toPx(v) ?? 0,
        );
        const [x = 0, y = 0, blur = 0] = lengths;
        const chroma = parsed ? hueOf(parsed.hex).chroma : 0;
        if (chroma >= 0.08 && ((x === 0 && y === 0 && blur >= 8) || blur >= 24)) {
          facts.glows.push({ ...at, raw: shadow.trim() });
        }
      }
    }
    if (d.prop === 'font-size') {
      const px = toPx(d.value);
      if (px !== null) facts.fontSizes.push({ ...at, px });
    }
    if (d.prop === 'border-radius' || /^border-(top|bottom)-(left|right)-radius$/.test(d.prop)) {
      for (const part of d.value.split(/\s+/)) {
        if (part === '50%' || part === '100%') facts.radii.push({ ...at, px: 'full' });
        else {
          const px = toPx(part);
          if (px !== null && px > 0) facts.radii.push({ ...at, px: px >= 999 ? 'full' : px });
        }
      }
    }
    if (SPACING_PROPS.test(d.prop)) {
      for (const part of d.value.split(/\s+/)) {
        const px = toPx(part);
        if (px !== null && px !== 0) facts.spacing.push({ ...at, px: Math.abs(px) });
      }
    }
    if (d.prop === 'font-family') {
      const first = d.value.split(',')[0]!.trim();
      if (!first.startsWith('var(') && first !== 'inherit') {
        if (DEFAULT_FONTS.test(first) || (o.hasDirection && GENERIC_FONTS.test(first))) {
          facts.defaultFonts.push(at);
        }
      }
    }
  }

  // Rule-level checks: text/background pairs and touch targets.
  const blocks = new Map<string, Decl[]>();
  for (const d of decls) {
    if (d.prop.startsWith('--')) continue;
    const key = d.selector;
    blocks.set(key, [...(blocks.get(key) ?? []), d]);
  }
  if (o.tokenFile) return;
  for (const [selector, list] of blocks) {
    const color = list.find((d) => d.prop === 'color');
    const bg = list.find((d) => d.prop === 'background-color' || d.prop === 'background');
    if (color && bg) {
      const fg = resolveColor(color.value, o);
      const bgc = resolveColor(bg.value, o);
      if (fg && bgc) {
        const size = list.find((d) => d.prop === 'font-size');
        const weight = list.find((d) => d.prop === 'font-weight');
        const sizePx = size ? (toPx(size.value) ?? undefined) : undefined;
        facts.textOnBackground.push({
          file: o.file,
          line: color.line,
          raw: `${selector} { color: ${color.value}; background: ${bg.value} }`,
          fg,
          bg: bgc,
          ...(sizePx !== undefined ? { sizePx } : {}),
          bold: weight ? /bold|[6-9]00/.test(weight.value) : false,
        });
      }
    }
    if (
      /(^|[\s,>+~])(button|a(?=$|[\s.:#[,>+~])|\.btn[\w-]*|\[role=["']?button["']?\])/.test(
        selector,
      )
    ) {
      for (const d of list) {
        if (d.prop === 'height' || d.prop === 'min-height') {
          const px = toPx(d.value);
          if (px !== null && px > 0) {
            facts.touchTargets.push({
              file: o.file,
              line: d.line,
              raw: `${selector} { ${d.prop}: ${d.value} }`,
              px,
            });
          }
        }
      }
    }
  }
}

/** Collects `--name: <color>` definitions to resolve var() references. */
export function customPropertyColors(decls: Decl[], map: Map<string, string>): void {
  for (const d of decls) {
    if (!d.prop.startsWith('--') || map.has(d.prop)) continue;
    if (/data-theme=['"]?dark|prefers-color-scheme:\s*dark/.test(d.selector)) continue;
    const c = parseCssColor(d.value);
    if (c && c.alpha === 1) map.set(d.prop, c.hex);
  }
}
