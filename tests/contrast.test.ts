import { describe, expect, it } from 'vitest';
import { oklchToRgb, parseHex, rgbToOklch, toHex } from '../src/a11y/color.js';
import {
  contrastHex,
  floorRatio,
  isLargeText,
  nearestPassingForeground,
} from '../src/a11y/contrast.js';

describe('parseHex / toHex', () => {
  it('parses short, long and alpha forms', () => {
    expect(toHex(parseHex('#fff')!)).toBe('#FFFFFF');
    expect(toHex(parseHex('0F6B4F')!)).toBe('#0F6B4F');
    expect(toHex(parseHex('#0F6B4F80')!)).toBe('#0F6B4F');
  });
  it('rejects invalid input', () => {
    expect(parseHex('#12')).toBeNull();
    expect(parseHex('red')).toBeNull();
    expect(parseHex('#GGGGGG')).toBeNull();
  });
  it('round-trips through OKLCH', () => {
    for (const hex of ['#0F6B4F', '#F7F6F3', '#B3261E', '#000000', '#FFFFFF']) {
      expect(toHex(oklchToRgb(rgbToOklch(parseHex(hex)!))!)).toBe(hex);
    }
  });
});

describe('contrast ratio (WCAG 2.x)', () => {
  it('matches known reference values', () => {
    expect(contrastHex('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastHex('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
    // #777777 on white is the classic "just fails AA" gray.
    expect(floorRatio(contrastHex('#777777', '#FFFFFF'))).toBe(4.47);
    expect(floorRatio(contrastHex('#767676', '#FFFFFF'))).toBe(4.54);
  });
  it('is symmetric', () => {
    expect(contrastHex('#0F6B4F', '#F7F6F3')).toBe(contrastHex('#F7F6F3', '#0F6B4F'));
  });
  it('throws on invalid colors', () => {
    expect(() => contrastHex('nope', '#FFFFFF')).toThrow(/Invalid color/);
  });
});

describe('isLargeText', () => {
  it('follows the WCAG thresholds', () => {
    expect(isLargeText(24, false)).toBe(true);
    expect(isLargeText(23, false)).toBe(false);
    expect(isLargeText(19, true)).toBe(true);
    expect(isLargeText(18, true)).toBe(false);
  });
});

describe('nearestPassingForeground', () => {
  it('returns the input when it already passes', () => {
    expect(nearestPassingForeground('#16181D', '#FFFFFF', 4.5)).toBe('#16181D');
  });
  it('finds a passing color with the same hue', () => {
    const fixed = nearestPassingForeground('#9AA0A6', '#FFFFFF', 4.5)!;
    expect(contrastHex(fixed, '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    const before = rgbToOklch(parseHex('#9AA0A6')!);
    const after = rgbToOklch(parseHex(fixed)!);
    expect(after.l).toBeLessThan(before.l);
  });
  it('lightens on dark backgrounds', () => {
    const fixed = nearestPassingForeground('#3A6B5C', '#111314', 4.5)!;
    expect(contrastHex(fixed, '#111314')).toBeGreaterThanOrEqual(4.5);
    expect(rgbToOklch(parseHex(fixed)!).l).toBeGreaterThan(rgbToOklch(parseHex('#3A6B5C')!).l);
  });
  it('is deterministic', () => {
    const a = nearestPassingForeground('#22AACC', '#FFFFFF', 4.5);
    const b = nearestPassingForeground('#22AACC', '#FFFFFF', 4.5);
    expect(a).toBe(b);
  });
  it('returns null for impossible targets', () => {
    expect(nearestPassingForeground('#777777', '#808080', 15)).toBeNull();
  });
});
