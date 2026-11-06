// Next.js adapter. App Router first (Next.js 16), Pages Router supported. TS or JS.
// Verified against the current Next.js docs: next/font (local self-hosts; google downloads at
// build time so browsers never call Google), the `viewport` export for themeColor, root layout
// rules, and Pages Router _document / _app. Tokens stay CSS-only so Server Components work
// unchanged; only the theme provider and toggle are Client Components.
import type { Direction } from '../../schema/direction.schema.js';
import { generatedHeader } from '../model.js';
import type { Adapter, AdapterOptions, GeneratedFile } from '../types.js';
import { baseCss } from './html.js';
import {
  reducedMotionModule,
  tailwindBaseLayer,
  themeModule,
  themeToggleModule,
  tokensModule,
} from './react-shared.js';
import { tailwindCss } from './tailwind.js';
import { tokensCss, webFontFiles } from './tokens.js';

interface FontLoader {
  family: string;
  ident: string; // JS identifier, e.g. jetbrainsMono
  googleImport: string; // next/font/google export, e.g. JetBrains_Mono
  cssVar: string; // --nf-jetbrains-mono
  weights: number[];
}

function fontLoaders(d: Direction): FontLoader[] {
  const byFamily = new Map<string, number[]>();
  for (const f of webFontFiles(d)) {
    byFamily.set(f.family, [...(byFamily.get(f.family) ?? []), f.weight]);
  }
  return [...byFamily.entries()].map(([family, weights]) => {
    const slug = family.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return {
      family,
      ident: slug.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase()),
      googleImport: family.replace(/ /g, '_'),
      cssVar: `--nf-${slug}`,
      weights,
    };
  });
}

function fontsModule(d: Direction, o: AdapterOptions, fontsDir: string): string {
  const loaders = fontLoaders(d);
  const header = generatedHeader(d, '//');
  const vars = `\n/** Put on <html className> so tokens.css can resolve the font variables. */\nexport const fontVariables = [${loaders
    .map((l) => `${l.ident}.variable`)
    .join(', ')}].join(' ');\n`;
  if (o.fontSource === 'google-fonts') {
    const imports = loaders.map((l) => l.googleImport).sort();
    const defs = loaders
      .map(
        (l) =>
          `export const ${l.ident} = ${l.googleImport}({\n  subsets: ['latin'],\n  weight: [${l.weights.map((w) => `'${w}'`).join(', ')}],\n  variable: '${l.cssVar}',\n  display: 'swap',\n});`,
      )
      .join('\n\n');
    return `${header}
// next/font/google downloads these at build time and serves them from your own domain.
import { ${imports.join(', ')} } from 'next/font/google';

${defs}
${vars}`;
  }
  const defs = loaders
    .map((l) => {
      const src = webFontFiles(d)
        .filter((f) => f.family === l.family)
        .map(
          (f) => `    { path: './${fontsDir}/${f.file}', weight: '${f.weight}', style: 'normal' },`,
        )
        .join('\n');
      return `export const ${l.ident} = localFont({\n  src: [\n${src}\n  ],\n  variable: '${l.cssVar}',\n  display: 'swap',\n});`;
    })
    .join('\n\n');
  return `${header}
// Self-hosted fonts (open licenses). Files live in ./${fontsDir}/ next to this module.
import localFont from 'next/font/local';

${defs}
${vars}`;
}

function globalsCss(d: Direction, o: AdapterOptions): string {
  if (o.together.includes('tailwind')) {
    return `${tailwindCss(d, { tokensPath: './tokens.css', dark: o.mode === 'both' })}\n${tailwindBaseLayer(d)}`;
  }
  return `@import "./tokens.css";\n\n${baseCss(d)}`;
}

function viewportExport(d: Direction, o: AdapterOptions, ts: boolean): string {
  const theme =
    o.mode === 'both'
      ? `[\n    { media: '(prefers-color-scheme: light)', color: '${d.color.light.bg}' },\n    { media: '(prefers-color-scheme: dark)', color: '${d.color.dark.bg}' },\n  ]`
      : `'${o.mode === 'dark' ? d.color.dark.bg : d.color.light.bg}'`;
  const scheme = o.mode === 'both' ? 'light dark' : o.mode;
  return `export const viewport${ts ? ': Viewport' : ''} = {\n  themeColor: ${theme},\n  colorScheme: '${scheme}',\n};`;
}

function appLayout(d: Direction, o: AdapterOptions, ts: boolean): string {
  const both = o.mode === 'both';
  const imports = [
    ...(ts
      ? [
          "import type { Metadata, Viewport } from 'next';",
          "import type { ReactNode } from 'react';",
        ]
      : []),
    ...(both ? ["import { ThemeProvider } from '../components/theme/theme';"] : []),
    ...(both ? ["import { NO_FLASH_SCRIPT } from '../components/theme/tokens';"] : []),
    "import { fontVariables } from './fonts';",
    "import './globals.css';",
  ];
  const head = both
    ? `\n      <head>\n        {/* Applies the saved or system theme before first paint (no flash). */}\n        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />\n      </head>`
    : '';
  const body = both ? '<ThemeProvider>{children}</ThemeProvider>' : '{children}';
  return `${generatedHeader(d, '//')}
${imports.join('\n')}

export const metadata${ts ? ': Metadata' : ''} = {
  title: 'Product name',
  description: 'One sentence that says what this is and who it is for.',
};

${viewportExport(d, o, ts)}

export default function RootLayout({ children }${ts ? ': { children: ReactNode }' : ''}) {
  return (
    // data-theme is set by the inline script before React hydrates; suppressHydrationWarning
    // applies to this element's attributes only (one level deep).
    <html lang="en" className={fontVariables}${both ? ' suppressHydrationWarning' : ''}>${head}
      <body>${body}</body>
    </html>
  );
}
`;
}

function pagesDocument(d: Direction, o: AdapterOptions): string {
  const both = o.mode === 'both';
  const meta =
    o.mode === 'both'
      ? `        <meta name="theme-color" media="(prefers-color-scheme: light)" content="${d.color.light.bg}" />\n        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${d.color.dark.bg}" />`
      : `        <meta name="theme-color" content="${o.mode === 'dark' ? d.color.dark.bg : d.color.light.bg}" />`;
  return `${generatedHeader(d, '//')}
import { Head, Html, Main, NextScript } from 'next/document';
${both ? "import { NO_FLASH_SCRIPT } from '../components/theme/tokens';\n" : ''}
export default function Document() {
  return (
    <Html lang="en"${both ? ' suppressHydrationWarning' : ''}>
      <Head>
${meta}${both ? '\n        <script dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }} />' : ''}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
`;
}

function pagesApp(d: Direction, o: AdapterOptions, ts: boolean): string {
  const both = o.mode === 'both';
  const loaders = fontLoaders(d);
  const fontCss = loaders
    .map((l) => `          ${l.cssVar}: \${${l.ident}.style.fontFamily};`)
    .join('\n');
  const page = both
    ? `<ThemeProvider>\n      <Component {...pageProps} />\n    </ThemeProvider>`
    : '<Component {...pageProps} />';
  return `${generatedHeader(d, '//')}
${ts ? "import type { AppProps } from 'next/app';\n" : ''}${both ? "import { ThemeProvider } from '../components/theme/theme';\n" : ''}import { ${loaders
    .map((l) => l.ident)
    .sort()
    .join(', ')} } from '../styles/fonts';
import '../styles/globals.css';

export default function App({ Component, pageProps }${ts ? ': AppProps' : ''}) {
  return (
    <>
      {/* Exposes the next/font families to tokens.css (Pages Router has no <html> className). */}
      <style jsx global>{\`
        :root {
${fontCss}
        }
      \`}</style>
      ${page.replace(/\n/g, '\n      ')}
    </>
  );
}
`;
}

export const nextjsAdapter: Adapter = (d, o) => {
  const ts = o.language === 'ts';
  const x = ts ? 'ts' : 'js';
  const xx = ts ? 'tsx' : 'jsx';
  const both = o.mode === 'both';
  const tailwind = o.together.includes('tailwind');
  const loaders = fontLoaders(d);
  const fontVar = (family: string) => loaders.find((l) => l.family === family)?.cssVar;
  const app = o.router === 'app';
  const base = app ? 'app' : 'styles';
  const fontsDir = 'fonts';

  const files: GeneratedFile[] = [
    { path: `${base}/tokens.css`, content: tokensCss(d, o, fontVar) },
    { path: `${base}/globals.css`, content: globalsCss(d, o) },
    { path: `${base}/fonts.${x}`, content: fontsModule(d, o, fontsDir) },
  ];
  if (app) {
    files.push({ path: `app/layout.${xx}`, content: appLayout(d, o, ts) });
  } else {
    files.push({ path: `pages/_document.${xx}`, content: pagesDocument(d, o) });
    files.push({ path: `pages/_app.${xx}`, content: pagesApp(d, o, ts) });
  }
  files.push({ path: `components/theme/tokens.${x}`, content: tokensModule(d, ts) });
  if (both) {
    files.push({ path: `components/theme/theme.${xx}`, content: themeModule(d, ts, true) });
    files.push({
      path: `components/theme/ThemeToggle.${xx}`,
      content: themeToggleModule(d, ts, true),
    });
  }
  files.push({
    path: `components/theme/useReducedMotion.${x}`,
    content: reducedMotionModule(d, ts, true),
  });
  if (tailwind) {
    files.push({
      path: 'postcss.config.mjs',
      content: "export default {\n  plugins: {\n    '@tailwindcss/postcss': {},\n  },\n};\n",
    });
  }

  const next: string[] = [
    app
      ? `app/layout.${xx} is a complete root layout: merge it with yours if you already have one (keep the globals.css import, fontVariables on <html>, the viewport export and the inline theme script).`
      : `pages/_document.${xx} and pages/_app.${xx} are complete: merge them with yours if they exist. Global CSS is imported only in _app.`,
    o.fontSource === 'self-hosted'
      ? `Put these woff2 files in ${base}/${fontsDir}/: ${webFontFiles(d)
          .map((f) => f.file)
          .join(', ')}. next/font/local serves them from your domain with size-adjusted fallbacks.`
      : 'Fonts use next/font/google: downloaded at build time and self-hosted, so browsers never contact Google. The build machine needs network access.',
    'If your project uses a src/ directory, place app/ (or pages/ and styles/) and components/ under src/.',
    "Keep tokens CSS-only: Server Components style with classes and var(--color-*); only files with 'use client' may call useTheme().",
  ];
  if (tailwind) {
    next.push(
      'Tailwind v4: npm install -D tailwindcss @tailwindcss/postcss (postcss.config.mjs is included). Use theme utilities only (bg-surface, text-text-muted, p-4, t-title); arbitrary values bypass the system.',
    );
  }
  if (both) {
    next.push('Render <ThemeToggle /> (a Client Component) wherever the theme switch belongs.');
  }
  next.push(
    'Prefer next/image over <img> for content images, and keep "use client" at the leaves of the tree.',
  );
  return { files, next_steps: next };
};
