import { describe, expect, it } from 'vitest';
import { generateTheme } from '../src/adapters/index.js';
import { type AdapterOptions, DEFAULT_OPTIONS } from '../src/adapters/types.js';
import { fluid, spacingVar, tokensCss } from '../src/adapters/web/tokens.js';
import { getDirection } from '../src/directions/index.js';
import type { PlatformId } from '../src/platforms.js';

const d = getDirection('fintech-trust')!;
const gen = (platforms: PlatformId[], o: Partial<AdapterOptions> = {}) =>
  generateTheme(d, platforms, { ...DEFAULT_OPTIONS, ...o });
const file = (platforms: PlatformId[], path: string, o: Partial<AdapterOptions> = {}) =>
  gen(platforms, o).files.find((f) => f.path === path)!.content;

describe('shared web tokens', () => {
  it('builds a clamp() that hits min at 360px and max at 1280px', () => {
    const c = fluid(32, 56);
    expect(c).toBe('clamp(2rem, 1.413rem + 2.6087vw, 3.5rem)');
    const at = (vw: number) => (1.413 * 16 + (2.6087 * vw) / 100) / 16;
    expect(at(360)).toBeCloseTo(2, 2);
    expect(at(1280)).toBeCloseTo(3.5, 2);
  });

  it('switches dark tokens by data-theme, with prefers-color-scheme as no-JS fallback', () => {
    const css = tokensCss(d, { mode: 'both' });
    expect(css).toContain(":root[data-theme='dark'] {");
    expect(css).toContain(':root:not([data-theme])');
    expect(css).toContain('--color-accent: #5CC49B;');
    expect(css).toContain('--text-display--font-weight: 600;');
    expect(css).toContain('--spacing-4: 1rem;');
  });

  it('light-only and dark-only output a single palette', () => {
    expect(tokensCss(d, { mode: 'light' })).not.toContain('data-theme');
    const dark = tokensCss(d, { mode: 'dark' });
    expect(dark).toContain('color-scheme: dark;');
    expect(dark).toContain('--color-bg: #111314;');
    expect(dark).not.toContain('#F7F6F3');
  });

  it('maps spacing requests onto the nearest real token', () => {
    expect(spacingVar(d, 16)).toBe('var(--spacing-4)');
    expect(spacingVar(d, 20)).toBe('var(--spacing-4)');
    expect(spacingVar(d, 100)).toBe('var(--spacing-24)');
  });

  it('is deterministic', () => {
    expect(JSON.stringify(gen(['html', 'tailwind']))).toBe(
      JSON.stringify(gen(['html', 'tailwind'])),
    );
  });
});

describe('html adapter', () => {
  it('emits tokens, fonts, base, theme script and a starter page', () => {
    expect(gen(['html']).files.map((f) => f.path)).toEqual([
      'css/tokens.css',
      'css/fonts.css',
      'css/base.css',
      'js/theme.js',
      'index.html',
    ]);
  });

  it('runs the no-flash snippet before any stylesheet', () => {
    const html = file(['html'], 'index.html');
    const snippet = html.indexOf("localStorage.getItem('theme')");
    const firstCss = html.indexOf('rel="stylesheet"');
    expect(snippet).toBeGreaterThan(0);
    expect(snippet).toBeLessThan(firstCss);
  });

  it('has the accessibility basics: lang, viewport, labelled landmarks, focus styles', () => {
    const html = file(['html'], 'index.html');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('name="viewport"');
    expect(html).toContain('aria-label="Main"');
    expect(file(['html'], 'css/base.css')).toContain(':focus-visible');
    expect(file(['html'], 'css/base.css')).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps hex colors and inline styles out of everything except tokens.css', () => {
    for (const path of ['css/base.css', 'index.html', 'js/theme.js']) {
      // <meta name="theme-color"> needs literal colors; everything else must use tokens.
      const body = file(['html'], path)
        .split('\n')
        .filter((l) => !l.includes('name="theme-color"'))
        .join('\n');
      expect(body).not.toMatch(/#[0-9a-f]{6}\b/i);
    }
    expect(file(['html'], 'index.html')).not.toContain('style="');
  });

  it('self-hosts fonts by default and only links Google Fonts when opted in', () => {
    const selfHosted = file(['html'], 'index.html');
    expect(selfHosted).not.toContain('fonts.googleapis.com');
    expect(selfHosted).toContain('href="fonts/manrope-400.woff2" as="font"');
    expect(file(['html'], 'css/fonts.css')).toContain('url("../fonts/fraunces-600.woff2")');
    const google = gen(['html'], { fontSource: 'google-fonts' });
    expect(google.files.some((f) => f.path === 'css/fonts.css')).toBe(false);
    const html = google.files.find((f) => f.path === 'index.html')!.content;
    expect(html).toContain(
      'https://fonts.googleapis.com/css2?family=Fraunces:wght@600&amp;family=Manrope:wght@400;500;600&amp;family=JetBrains+Mono:wght@400&amp;display=swap',
    );
  });

  it('drops the toggle and theme script in single-mode output', () => {
    const out = gen(['html'], { mode: 'light' });
    expect(out.files.some((f) => f.path === 'js/theme.js')).toBe(false);
    const html = out.files.find((f) => f.path === 'index.html')!.content;
    expect(html).not.toContain('data-theme-toggle');
    expect(html).toContain('<meta name="color-scheme" content="light">');
  });
});

describe('tailwind adapter', () => {
  it('resets default namespaces so only direction tokens become utilities', () => {
    const css = file(['tailwind'], 'css/tailwind.css');
    for (const reset of [
      '--color-*',
      '--text-*',
      '--spacing-*',
      '--radius-*',
      '--shadow-*',
      '--blur-*',
    ]) {
      expect(css).toContain(`${reset}: initial;`);
    }
    expect(css.indexOf('@import "tailwindcss";')).toBeLessThan(
      css.indexOf('@import "./tokens.css";'),
    );
    expect(css).toContain(
      '@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));',
    );
    expect(css).toContain('@utility t-display {');
  });

  it('shares identical tokens.css with the html adapter when combined', () => {
    const combined = gen(['html', 'tailwind']);
    expect(combined.files.filter((f) => f.path === 'css/tokens.css')).toHaveLength(1);
    expect(file(['tailwind'], 'css/tokens.css')).toBe(file(['html'], 'css/tokens.css'));
    expect(file(['html', 'tailwind'], 'index.html')).toContain('href="css/output.css"');
  });

  it('matches snapshots', () => {
    for (const f of gen(['html', 'tailwind']).files) expect(f.content).toMatchSnapshot(f.path);
  });
});
