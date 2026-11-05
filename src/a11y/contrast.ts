// WCAG 2.x contrast math (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).
import { oklchToRgbClamped, parseHex, type Rgb, rgbToOklch, toHex } from './color.js';

export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;
export const AAA_NORMAL = 7;
export const AAA_LARGE = 4.5;

const channel = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(fg: Rgb, bg: Rgb): number {
  const a = relativeLuminance(fg);
  const b = relativeLuminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Contrast ratio of two hex colors. Throws on invalid input. */
export function contrastHex(fg: string, bg: string): number {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f) throw new Error(`Invalid color: ${fg}`);
  if (!b) throw new Error(`Invalid color: ${bg}`);
  return contrastRatio(f, b);
}

/**
 * WCAG "large text": at least 18pt (24px) regular, or 14pt (~18.67px) bold.
 */
export function isLargeText(sizePx: number, bold: boolean): boolean {
  return sizePx >= 24 || (bold && sizePx >= 18.66);
}

/** Rounds down to 2 decimals so a reported value never overstates the real ratio. */
export function floorRatio(ratio: number): number {
  return Math.floor(ratio * 100) / 100;
}

/**
 * Finds the foreground color closest to `fg` (same hue, OKLCH lightness moved
 * toward black or white) that reaches `target` against `bg`. Returns null if
 * neither direction can reach the target.
 */
export function nearestPassingForeground(fg: string, bg: string, target: number): string | null {
  const f = parseHex(fg);
  const b = parseHex(bg);
  if (!f || !b) return null;
  if (contrastRatio(f, b) >= target) return toHex(f);
  const start = rgbToOklch(f);

  const search = (towardWhite: boolean): { hex: string; delta: number } | null => {
    const end = towardWhite ? 1 : 0;
    const at = (t: number) => oklchToRgbClamped({ ...start, l: start.l + (end - start.l) * t });
    if (contrastRatio(at(1), b) < target) return null;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (contrastRatio(at(mid), b) >= target) hi = mid;
      else lo = mid;
    }
    // Rounding to 8-bit can drop just below the target; nudge until it passes.
    let t = hi;
    let hex = toHex(at(t));
    while (contrastRatio(parseHex(hex)!, b) < target && t < 1) {
      t = Math.min(1, t + 0.002);
      hex = toHex(at(t));
    }
    return { hex, delta: Math.abs(end - start.l) * t };
  };

  const candidates = [search(false), search(true)].filter(
    (x): x is { hex: string; delta: number } => x !== null,
  );
  if (candidates.length === 0) return null;
  candidates.sort((x, y) => x.delta - y.delta || x.hex.localeCompare(y.hex));
  return candidates[0]!.hex;
}
