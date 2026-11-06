// React adapter (Vite-style single-page apps; works with any React setup). TS or JS output.
// No component library. Styling works with plain CSS, CSS Modules or Tailwind.
import type { Adapter, GeneratedFile } from '../types.js';
import { baseCss } from './html.js';
import {
  reducedMotionModule,
  tailwindBaseLayer,
  themeModule,
  themeToggleModule,
  tokensModule,
} from './react-shared.js';
import { tailwindCss } from './tailwind.js';
import {
  fontFaceCss,
  googleFontsUrl,
  NO_FLASH_SNIPPET,
  tokensCss,
  webFontFiles,
} from './tokens.js';

export const reactAdapter: Adapter = (d, o) => {
  const ts = o.language === 'ts';
  const x = ts ? 'ts' : 'js';
  const xx = ts ? 'tsx' : 'jsx';
  const tailwind = o.together.includes('tailwind');
  const selfHosted = o.fontSource === 'self-hosted';
  const both = o.mode === 'both';

  const files: GeneratedFile[] = [{ path: 'src/theme/tokens.css', content: tokensCss(d, o) }];
  if (selfHosted) files.push({ path: 'src/theme/fonts.css', content: fontFaceCss(d, '/fonts/') });
  if (tailwind) {
    files.push({
      path: 'src/index.css',
      content: `${tailwindCss(d, {
        tokensPath: './theme/tokens.css',
        fontsPath: selfHosted ? './theme/fonts.css' : undefined,
        dark: both,
      })}\n${tailwindBaseLayer(d)}`,
    });
  } else {
    files.push({ path: 'src/theme/base.css', content: baseCss(d) });
  }
  files.push({ path: `src/theme/tokens.${x}`, content: tokensModule(d, ts) });
  if (both) {
    files.push({ path: `src/theme/theme.${xx}`, content: themeModule(d, ts, false) });
    files.push({ path: `src/theme/ThemeToggle.${xx}`, content: themeToggleModule(d, ts, false) });
  }
  files.push({
    path: `src/theme/useReducedMotion.${x}`,
    content: reducedMotionModule(d, ts, false),
  });

  const imports = tailwind
    ? ['./index.css']
    : [...(selfHosted ? ['./theme/fonts.css'] : []), './theme/tokens.css', './theme/base.css'];
  const next: string[] = [
    `In src/main.${xx}, add ${imports.map((i) => `import '${i}';`).join(' ')} before importing App.`,
  ];
  if (both) {
    next.push(
      `In index.html <head>, before any stylesheet, add <script>${NO_FLASH_SNIPPET}</script> so the right theme applies before first paint. Wrap <App /> in <ThemeProvider> from src/theme/theme.${xx} and use <ThemeToggle /> for the switch.`,
    );
  }
  next.push(
    selfHosted
      ? `Put these woff2 files in public/fonts/: ${webFontFiles(d)
          .map((f) => f.file)
          .join(
            ', ',
          )} (open-licensed; from Google Fonts or @fontsource). src/theme/fonts.css declares them.`
      : `Add to index.html <head>: <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${googleFontsUrl(d)}"> (opt-in; self-hosting is faster and private).`,
  );
  if (tailwind) {
    next.push(
      'Tailwind v4 with Vite: npm install tailwindcss @tailwindcss/vite, then add tailwindcss() from "@tailwindcss/vite" to the plugins in vite.config. Use theme utilities (bg-surface, text-text-muted, p-4, t-title) only.',
    );
  } else {
    next.push(
      'Plain CSS: use the .t-* role classes and var(--color-*), var(--spacing-*), var(--radius-*). CSS Modules: same variables inside module files (they are global custom properties). Inline styles: import { color, space, text } from the tokens module.',
    );
  }
  next.push(
    'Never hardcode hex colors, px font sizes or off-scale spacing in components. Use useReducedMotion() to turn off non-essential animation.',
  );
  return { files, next_steps: next };
};
