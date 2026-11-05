// Plain HTML + CSS + vanilla JavaScript adapter.
// Output: css/tokens.css, css/fonts.css (self-hosted), css/base.css, js/theme.js, index.html.
import type { Direction } from '../../schema/direction.schema.js';
import { generatedHeader } from '../model.js';
import type { Adapter, AdapterOptions, GeneratedFile } from '../types.js';
import {
  fontFaceCss,
  googleFontsUrl,
  NO_FLASH_SNIPPET,
  roleClassesCss,
  spacingVar,
  themeColorMeta,
  tokensCss,
  webFontFiles,
} from './tokens.js';

function cssHeader(d: Direction, extra: string): string {
  return `${generatedHeader(d, '/*').replace(/\n\/\*/g, '\n *')}\n * ${extra}\n */`;
}

export function baseCss(d: Direction): string {
  const sp = (px: number) => spacingVar(d, px);
  const tabular = d.typography.numerals === 'tabular';
  return `${cssHeader(d, 'Modern reset, base typography, focus and reduced-motion handling.')}

*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

html {
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

body {
  min-height: 100dvh;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: var(--text-body--line-height);
  letter-spacing: var(--text-body--letter-spacing);
  font-weight: var(--text-body--font-weight);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;${tabular ? '\n  font-variant-numeric: tabular-nums;' : ''}
}

img,
picture,
video,
canvas,
svg {
  display: block;
  max-width: 100%;
}

input,
button,
textarea,
select {
  font: inherit;
  color: inherit;
}

h1,
h2,
h3,
h4 {
  text-wrap: balance;
}

p {
  text-wrap: pretty;
}

a {
  color: var(--color-link);
  text-underline-offset: 0.2em;
}

::selection {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

/* Visible keyboard focus everywhere; never remove it without this replacement. */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Typography roles: use these instead of ad-hoc font sizes. */
${roleClassesCss(d)}

.t-muted {
  color: var(--color-text-muted);
}

/* Numbers that line up in tables, balances and prices. */
.num {
  font-variant-numeric: tabular-nums;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Components that follow the direction rules. */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${sp(8)};
  min-height: var(--size-touch);
  padding: 0 ${sp(20)};
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: var(--text-body-small);
  line-height: 1;
  font-weight: var(--text-title--font-weight);
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) var(--ease-standard),
    border-color var(--duration-fast) var(--ease-standard),
    color var(--duration-fast) var(--ease-standard);
}

.btn-primary {
  background: var(--color-accent);
  color: var(--color-on-accent);
}

.btn-primary:hover {
  background: color-mix(in srgb, var(--color-accent) 88%, var(--color-text));
}

.btn-secondary {
  background: transparent;
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.btn-secondary:hover {
  background: var(--color-surface-alt);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: ${sp(24)};
}

.field {
  display: grid;
  gap: ${sp(8)};
}

.field label {
  font-size: var(--text-label);
  line-height: var(--text-label--line-height);
  letter-spacing: var(--text-label--letter-spacing);
  font-weight: var(--text-label--font-weight);
}

.input {
  min-height: var(--size-touch);
  padding: 0 ${sp(12)};
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
}

.divider {
  border: 0;
  border-top: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
`;
}

export function themeJs(d: Direction): string {
  return `${generatedHeader(d, '//')}
// Light/dark theme toggle. The theme lives in <html data-theme="light|dark"> and the
// user's explicit choice is stored in localStorage under "theme". Without a stored choice
// the system setting is followed, including live changes.
//
// Put the inline snippet from index.html in <head> BEFORE any stylesheet so the right
// theme is applied before first paint (no flash). This file adds the toggle behaviour.
(function () {
  var KEY = 'theme';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try {
      var t = localStorage.getItem(KEY);
      return t === 'light' || t === 'dark' ? t : null;
    } catch (e) {
      return null;
    }
  }

  function apply(theme) {
    root.setAttribute('data-theme', theme);
    var buttons = document.querySelectorAll('[data-theme-toggle]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-pressed', String(theme === 'dark'));
    }
  }

  function current() {
    return stored() || (media.matches ? 'dark' : 'light');
  }

  function set(theme) {
    try {
      localStorage.setItem(KEY, theme);
    } catch (e) {}
    apply(theme);
  }

  media.addEventListener('change', function () {
    if (!stored()) apply(current());
  });

  document.addEventListener('click', function (event) {
    var target = event.target instanceof Element ? event.target.closest('[data-theme-toggle]') : null;
    if (target) set(current() === 'dark' ? 'light' : 'dark');
  });

  apply(current());
  window.theme = { get: current, set: set };
})();
`;
}

function head(d: Direction, o: AdapterOptions, title: string): string {
  const fontLinks =
    o.fontSource === 'google-fonts'
      ? [
          '<link rel="preconnect" href="https://fonts.googleapis.com">',
          '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
          `<link rel="stylesheet" href="${googleFontsUrl(d).replace(/&/g, '&amp;')}">`,
        ]
      : [
          ...webFontFiles(d)
            .filter((f) => f.family === d.typography.body_family.name && f.weight === 400)
            .map(
              (f) =>
                `<link rel="preload" href="fonts/${f.file}" as="font" type="font/woff2" crossorigin>`,
            ),
          '<link rel="stylesheet" href="css/fonts.css">',
        ];
  const noFlash = o.mode === 'both' ? [`<script>${NO_FLASH_SNIPPET}</script>`] : [];
  return [
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    '<meta name="description" content="One sentence that says what this is and who it is for.">',
    `<meta name="color-scheme" content="${o.mode === 'both' ? 'light dark' : o.mode}">`,
    ...themeColorMeta(d, o.mode),
    ...noFlash,
    ...fontLinks,
    '<link rel="stylesheet" href="css/tokens.css">',
    '<link rel="stylesheet" href="css/base.css">',
    ...(o.together.includes('tailwind') ? ['<link rel="stylesheet" href="css/output.css">'] : []),
  ]
    .map((l) => `    ${l}`)
    .join('\n');
}

/** Page-level layout styles for the starter, built only from tokens. */
function pageCss(d: Direction): string {
  const sp = (px: number) => spacingVar(d, px);
  return [
    `.wrap { max-width: 72rem; margin: 0 auto; padding: 0 ${sp(24)}; }`,
    `.stack > * + * { margin-top: ${sp(16)}; }`,
    `.section { padding-block: ${sp(96)}; }`,
    '.section + .section { border-top: 1px solid var(--color-border); }',
    `.nav { display: flex; align-items: center; justify-content: space-between; min-height: ${sp(64)}; }`,
    '.brand { color: var(--color-text); text-decoration: none; }',
    `.nav-links { display: flex; align-items: center; gap: ${sp(24)}; list-style: none; padding: 0; }`,
    '.nav-links a:not(.btn) { color: var(--color-text); text-decoration: none; }',
    `.hero { padding-block: ${sp(96)} ${sp(64)}; }`,
    '.hero > * { max-width: 44rem; }',
    `.hero h1 { margin-top: ${sp(12)}; }`,
    `.lede { margin-top: ${sp(16)}; max-width: 36rem; }`,
    `.actions { display: flex; flex-wrap: wrap; gap: ${sp(12)}; margin-top: ${sp(32)}; }`,
    `.section-body { margin-top: ${sp(32)}; }`,
    `.grid-3 { display: grid; gap: ${sp(24)}; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); padding: 0; list-style: none; }`,
    `.logos { display: flex; flex-wrap: wrap; gap: ${sp(32)}; color: var(--color-text-muted); }`,
    '.plan-featured { border-color: var(--color-accent); }',
    `.faq details { padding-block: ${sp(16)}; border-bottom: 1px solid var(--color-border); }`,
    '.faq summary { cursor: pointer; font-weight: var(--text-title--font-weight); }',
    `.faq details p { margin-top: ${sp(12)}; }`,
    `.footer { padding-block: ${sp(48)}; color: var(--color-text-muted); }`,
    '@media (max-width: 40rem) { .hide-sm { display: none; } }',
  ]
    .map((l) => `      ${l}`)
    .join('\n');
}

const THEME_TOGGLE = `
          <li>
            <button class="btn btn-secondary" type="button" data-theme-toggle aria-pressed="false">
              <span class="visually-hidden">Dark theme</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            </button>
          </li>`;

const LANDING_BODY = `
    <main>
      <!-- HERO: one promise, one primary action. Headline up to 8 words, subline up to 25 words. -->
      <section class="wrap hero" aria-labelledby="hero-title">
        <p class="t-label t-muted">Say who it is for</p>
        <h1 id="hero-title" class="t-display">State the outcome, not the feature</h1>
        <p class="lede t-body t-muted">
          One or two sentences on what the product does and why it is different. Concrete nouns, no hype.
        </p>
        <div class="actions">
          <a class="btn btn-primary" href="#start">Primary action</a>
          <a class="btn btn-secondary" href="#how">See how it works</a>
        </div>
      </section>

      <!-- SOCIAL PROOF: real customer names, numbers or one short quote. -->
      <section class="wrap" aria-label="Trusted by">
        <div class="logos t-label">
          <span>Customer one</span><span>Customer two</span><span>Customer three</span><span>Customer four</span>
        </div>
      </section>

      <!-- FEATURES: three blocks maximum. Title up to 5 words, body up to 30 words each. -->
      <section class="wrap section" aria-labelledby="features-title">
        <h2 id="features-title" class="t-headline">Why people choose it</h2>
        <div class="grid-3 section-body">
          <article class="card stack">
            <h3 class="t-title">First benefit</h3>
            <p class="t-body-small t-muted">What the user gets, in plain words, with a number if you have one.</p>
          </article>
          <article class="card stack">
            <h3 class="t-title">Second benefit</h3>
            <p class="t-body-small t-muted">What the user gets, in plain words, with a number if you have one.</p>
          </article>
          <article class="card stack">
            <h3 class="t-title">Third benefit</h3>
            <p class="t-body-small t-muted">What the user gets, in plain words, with a number if you have one.</p>
          </article>
        </div>
      </section>

      <!-- HOW IT WORKS: three numbered steps. -->
      <section id="how" class="wrap section" aria-labelledby="how-title">
        <h2 id="how-title" class="t-headline">How it works</h2>
        <ol class="grid-3 section-body">
          <li class="stack"><span class="t-label t-muted num">01</span><h3 class="t-title">First step</h3><p class="t-body-small t-muted">One sentence.</p></li>
          <li class="stack"><span class="t-label t-muted num">02</span><h3 class="t-title">Second step</h3><p class="t-body-small t-muted">One sentence.</p></li>
          <li class="stack"><span class="t-label t-muted num">03</span><h3 class="t-title">Third step</h3><p class="t-body-small t-muted">One sentence.</p></li>
        </ol>
      </section>

      <!-- PRICING: two or three plans. Highlight one with a border, never a gradient. -->
      <section id="pricing" class="wrap section" aria-labelledby="pricing-title">
        <h2 id="pricing-title" class="t-headline">Pricing</h2>
        <div class="grid-3 section-body">
          <article class="card stack">
            <h3 class="t-title">Starter</h3>
            <p class="t-headline num">$0</p>
            <p class="t-body-small t-muted">Who this plan is for.</p>
            <a class="btn btn-secondary" href="#start">Choose Starter</a>
          </article>
          <article class="card stack plan-featured">
            <h3 class="t-title">Pro</h3>
            <p class="t-headline num">$12 <span class="t-body t-muted">per month</span></p>
            <p class="t-body-small t-muted">Who this plan is for.</p>
            <a class="btn btn-primary" href="#start">Choose Pro</a>
          </article>
        </div>
      </section>

      <!-- FAQ: the questions people actually ask before buying. -->
      <section class="wrap section faq" aria-labelledby="faq-title">
        <h2 id="faq-title" class="t-headline">Questions</h2>
        <div class="section-body">
          <details><summary>A question customers ask before buying?</summary><p class="t-body t-muted">A direct, specific answer.</p></details>
          <details><summary>Another real question?</summary><p class="t-body t-muted">A direct, specific answer.</p></details>
        </div>
      </section>

      <!-- FINAL CTA: repeat the single primary action. -->
      <section id="start" class="wrap section" aria-labelledby="cta-title">
        <h2 id="cta-title" class="t-headline">Restate the outcome in one line</h2>
        <div class="actions"><a class="btn btn-primary" href="#">Primary action</a></div>
      </section>
    </main>

    <footer class="wrap footer t-body-small">
      <p>&copy; Company name. Address or legal line.</p>
    </footer>
`;

/** Starter landing page that follows the landing-page blueprint. Copy is guidance to replace. */
export function indexHtml(d: Direction, o: AdapterOptions): string {
  const comment = generatedHeader(d, '').replace(/^ /, '').replace(/\n /g, '\n     ');
  const script = o.mode === 'both' ? '    <script src="js/theme.js" defer></script>\n' : '';
  return [
    '<!doctype html>',
    `<!-- ${comment} -->`,
    '<html lang="en">',
    '  <head>',
    head(d, o, 'Product name: what it does, for whom'),
    '    <style>',
    pageCss(d),
    '    </style>',
    '  </head>',
    '  <body>',
    '    <header class="wrap nav">',
    '      <a href="/" class="brand t-title">Product name</a>',
    '      <nav aria-label="Main">',
    '        <ul class="nav-links">',
    '          <li class="hide-sm"><a href="#how">How it works</a></li>',
    '          <li class="hide-sm"><a href="#pricing">Pricing</a></li>',
    `          <li><a class="btn btn-primary" href="#start">Get started</a></li>${o.mode === 'both' ? THEME_TOGGLE : ''}`,
    '        </ul>',
    '      </nav>',
    '    </header>',
    `${LANDING_BODY}${script}  </body>`,
    '</html>',
    '',
  ].join('\n');
}

export const htmlAdapter: Adapter = (d, o) => {
  const files: GeneratedFile[] = [{ path: 'css/tokens.css', content: tokensCss(d, o) }];
  if (o.fontSource === 'self-hosted') {
    files.push({ path: 'css/fonts.css', content: fontFaceCss(d, '../fonts/') });
  }
  files.push({ path: 'css/base.css', content: baseCss(d) });
  if (o.mode === 'both') files.push({ path: 'js/theme.js', content: themeJs(d) });
  files.push({ path: 'index.html', content: indexHtml(d, o) });

  const fonts = webFontFiles(d);
  const next: string[] = [
    o.fontSource === 'self-hosted'
      ? `Add these woff2 files to fonts/: ${fonts.map((f) => f.file).join(', ')}. Download them from each family's Google Fonts page or the @fontsource packages (open licenses: ${[...new Set([d.typography.display_family, d.typography.body_family, d.typography.mono_family].filter(Boolean).map((f) => `${f!.name} ${f!.license}`))].join(', ')}). css/fonts.css already declares them with font-display: swap.`
      : 'Fonts load from Google Fonts via the <link> in <head> (opt-in). For privacy and speed, switch to font_source "self-hosted" before launch.',
    'Load order in <head>: the inline theme snippet first, then fonts, tokens.css, base.css. Keep the inline snippet inline; moving it to a file brings back the flash of the wrong theme.',
    'Use only var(--color-*), var(--spacing-*), var(--radius-*) and the .t-* type classes in your CSS. Never write hex colors or off-scale px values in page styles.',
    'Replace every piece of guidance copy in index.html with real, specific copy. Keep one primary action per view.',
  ];
  if (o.mode === 'both') {
    next.push(
      'Any element with data-theme-toggle toggles light/dark; js/theme.js keeps aria-pressed in sync.',
    );
  }
  return { files, next_steps: next };
};
