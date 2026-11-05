import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { generateTheme } from '../src/adapters/index.js';
import { type AdapterOptions, DEFAULT_OPTIONS } from '../src/adapters/types.js';
import { getDirection } from '../src/directions/index.js';
import type { PlatformId } from '../src/platforms.js';

const d = getDirection('fintech-trust')!;
const gen = (platforms: PlatformId[], o: Partial<AdapterOptions> = {}) =>
  generateTheme(d, platforms, { ...DEFAULT_OPTIONS, ...o });
const paths = (platforms: PlatformId[], o: Partial<AdapterOptions> = {}) =>
  gen(platforms, o).files.map((f) => f.path);
const file = (platforms: PlatformId[], path: string, o: Partial<AdapterOptions> = {}) =>
  gen(platforms, o).files.find((f) => f.path === path)!.content;

const tmpDirs: string[] = [];
afterAll(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
});

/** Parses JS/JSX output with the TypeScript compiler (syntax only, no type checking). */
function assertValidJs(files: Array<{ path: string; content: string }>) {
  const dir = mkdtempSync(join(tmpdir(), 'pui-js-'));
  tmpDirs.push(dir);
  const sources = files.filter((f) => /\.(m?js|jsx)$/.test(f.path));
  for (const f of sources) {
    const target = join(dir, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
  }
  const tsc = join(import.meta.dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc');
  execFileSync(
    process.execPath,
    [
      tsc,
      '--noEmit',
      '--allowJs',
      '--checkJs',
      'false',
      '--jsx',
      'preserve',
      '--module',
      'esnext',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
      '--skipLibCheck',
      '--noResolve',
      ...sources.map((f) => join(dir, f.path)),
    ],
    { stdio: 'pipe', cwd: dir },
  );
  return sources.length;
}

describe('react adapter', () => {
  it('emits typed theme files for TypeScript', () => {
    expect(paths(['react'], { language: 'ts' })).toEqual([
      'src/theme/tokens.css',
      'src/theme/fonts.css',
      'src/theme/base.css',
      'src/theme/tokens.ts',
      'src/theme/theme.tsx',
      'src/theme/ThemeToggle.tsx',
      'src/theme/useReducedMotion.ts',
    ]);
  });

  it('emits JavaScript without type syntax, and it parses', () => {
    const out = gen(['react'], { language: 'js' });
    expect(out.files.map((f) => f.path)).toContain('src/theme/theme.jsx');
    for (const f of out.files.filter((x) => /\.jsx?$/.test(x.path))) {
      expect(f.content).not.toMatch(/: (string|number|boolean|Theme|ReactNode)\b|as const|type /);
    }
    expect(assertValidJs(out.files)).toBeGreaterThanOrEqual(4);
  }, 30_000);

  it('uses the Tailwind entry instead of base.css when combined with tailwind', () => {
    const p = paths(['react', 'tailwind']);
    expect(p).toContain('src/index.css');
    expect(p).not.toContain('src/theme/base.css');
    expect(file(['react', 'tailwind'], 'src/index.css')).toContain('@import "./theme/tokens.css";');
  });

  it('reads theme from the DOM with a null server snapshot (no hydration mismatch)', () => {
    const theme = file(['react'], 'src/theme/theme.tsx');
    expect(theme).toContain('useSyncExternalStore(subscribe, readTheme, () => null)');
    expect(file(['react'], 'src/theme/useReducedMotion.ts')).toContain('() => false');
  });

  it('exposes tokens as CSS variable references plus raw palettes', () => {
    const tokens = file(['react'], 'src/theme/tokens.ts');
    expect(tokens).toContain("accent: 'var(--color-accent)',");
    expect(tokens).toContain("accent: '#5CC49B',");
    expect(tokens).toContain('export const NO_FLASH_SCRIPT');
  });
});

describe('nextjs adapter', () => {
  it('App Router: layout, globals, tokens, fonts, client-only theme modules', () => {
    expect(paths(['nextjs'])).toEqual([
      'app/tokens.css',
      'app/globals.css',
      'app/fonts.ts',
      'app/layout.tsx',
      'components/theme/tokens.ts',
      'components/theme/theme.tsx',
      'components/theme/ThemeToggle.tsx',
      'components/theme/useReducedMotion.ts',
    ]);
    const layout = file(['nextjs'], 'app/layout.tsx');
    expect(layout).toContain('export const viewport: Viewport = {');
    expect(layout).toContain("{ media: '(prefers-color-scheme: dark)', color: '#111314' }");
    expect(layout).toContain('suppressHydrationWarning');
    expect(layout).toContain('<script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />');
    expect(layout).not.toContain("'use client'");
    expect(file(['nextjs'], 'components/theme/theme.tsx').startsWith("'use client';")).toBe(true);
    // The script constant must come from a server-safe module.
    expect(file(['nextjs'], 'components/theme/tokens.ts')).not.toContain("'use client'");
  });

  it('self-hosts fonts with next/font/local; google is opt-in', () => {
    expect(file(['nextjs'], 'app/fonts.ts')).toContain("import localFont from 'next/font/local';");
    expect(file(['nextjs'], 'app/fonts.ts')).toContain("path: './fonts/manrope-400.woff2'");
    const google = file(['nextjs'], 'app/fonts.ts', { fontSource: 'google-fonts' });
    expect(google).toContain(
      "import { Fraunces, JetBrains_Mono, Manrope } from 'next/font/google';",
    );
    expect(file(['nextjs'], 'app/tokens.css')).toContain(
      '--font-body: var(--nf-manrope), system-ui',
    );
  });

  it('Pages Router: _document with the script, _app with global CSS and font variables', () => {
    const p = paths(['nextjs'], { router: 'pages' });
    expect(p).toEqual(
      expect.arrayContaining(['pages/_document.tsx', 'pages/_app.tsx', 'styles/globals.css']),
    );
    expect(file(['nextjs'], 'pages/_app.tsx', { router: 'pages' })).toContain(
      // biome-ignore lint/suspicious/noTemplateCurlyInString: asserts a literal template placeholder in generated code.
      '--nf-manrope: ${manrope.style.fontFamily};',
    );
  });

  it('adds postcss config and the Tailwind entry when combined with tailwind', () => {
    expect(paths(['nextjs', 'tailwind'])).toContain('postcss.config.mjs');
    expect(file(['nextjs', 'tailwind'], 'app/globals.css')).toContain('@import "tailwindcss";');
  });

  it('JavaScript output parses for both routers', () => {
    expect(assertValidJs(gen(['nextjs', 'tailwind'], { language: 'js' }).files)).toBeGreaterThan(4);
    expect(
      assertValidJs(gen(['nextjs'], { language: 'js', router: 'pages' }).files),
    ).toBeGreaterThan(4);
  }, 30_000);

  it('matches snapshots (ts and js, app and pages)', () => {
    for (const language of ['ts', 'js'] as const) {
      for (const router of ['app', 'pages'] as const) {
        for (const f of gen(['nextjs'], { language, router }).files) {
          expect(f.content).toMatchSnapshot(`${language}/${router}/${f.path}`);
        }
      }
      for (const f of gen(['react'], { language }).files) {
        expect(f.content).toMatchSnapshot(`react/${language}/${f.path}`);
      }
    }
  });
});
