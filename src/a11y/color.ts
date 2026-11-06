// Small, dependency-free color math: hex parsing, sRGB <-> OKLab/OKLCH.

export interface Rgb {
  r: number; // 0..1, gamma-encoded sRGB
  g: number;
  b: number;
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Parses #RGB, #RRGGBB or #RRGGBBAA (alpha is ignored). Returns null if invalid. */
export function parseHex(input: string): Rgb | null {
  const m = HEX_RE.exec(input.trim());
  if (!m) return null;
  let hex = m[1]!;
  if (hex.length === 3) hex = [...hex].map((c) => c + c).join('');
  const n = Number.parseInt(hex.slice(0, 6), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export function toHex({ r, g, b }: Rgb): string {
  const c = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();
  return `#${c(r)}${c(g)}${c(b)}`;
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export interface Oklch {
  l: number;
  c: number;
  h: number; // degrees
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(A, B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { l: L, c: C, h: H };
}

/** Converts OKLCH to sRGB. Returns null when the color is outside the sRGB gamut. */
export function oklchToRgb({ l: L, c: C, h: H }: Oklch): Rgb | null {
  const hr = (H * Math.PI) / 180;
  const A = C * Math.cos(hr);
  const B = C * Math.sin(hr);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  const eps = 1e-4;
  if ([lr, lg, lb].some((v) => v < -eps || v > 1 + eps)) return null;
  return { r: fromLinear(clamp01(lr)), g: fromLinear(clamp01(lg)), b: fromLinear(clamp01(lb)) };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** OKLCH -> sRGB, reducing chroma until the color fits in gamut (keeps hue and lightness). */
export function oklchToRgbClamped(color: Oklch): Rgb {
  let lo = 0;
  let hi = color.c;
  const direct = oklchToRgb(color);
  if (direct) return direct;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (oklchToRgb({ ...color, c: mid })) lo = mid;
    else hi = mid;
  }
  return oklchToRgb({ ...color, c: lo }) ?? { r: color.l, g: color.l, b: color.l };
}
