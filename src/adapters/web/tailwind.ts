// Tailwind CSS adapter. Targets Tailwind v4 (verified against v4.3 docs and the 4.3.4 CLI):
// CSS-first configuration with @theme. Default color, font, text, spacing, radius, shadow,
// ease and blur namespaces are reset so only direction tokens exist as utilities
// (bg-indigo-500 and p-5 simply do not compile). Runtime values come from tokens.css, which
// is unlayered and therefore overrides the @theme defaults, so dark mode needs no dark: classes.
import type { Direction } from '../../schema/direction.schema.js';
import { generatedHeader, kebab, num, resolvePalette, spacingTokens, typeRoles } from '../model.js';
import type { Adapter } from '../types.js';
import { fluid, fontFaceCss, fontStack, rem, tokensCss } from './tokens.js';

const COLOR_KEYS = [
  'bg',
  'surface',
  'surface_alt',
  'text',
  'text_muted',
  'border',
  'border_strong',
  'accent',
  'on_accent',
  'link',
  'success',
  'on_success',
  'warning',
  'on_warning',
  'error',
  'on_error',
] as const;

/** The @theme block. Values mirror tokens.css (light) and are overridden by it at runtime. */
export function themeBlock(d: Direction): string {
  const p = resolvePalette(d.color.light);
  const t = d.typography;
  const mono = t.mono_family ?? t.body_family;
  const lines: string[] = [];
  const add = (l = '') => lines.push(l ? `  ${l}` : '');

  add('/* Only direction colors exist: no default palette (no indigo, purple, violet...). */');
  add('--color-*: initial;');
  for (const k of COLOR_KEYS) add(`--color-${kebab(k)}: ${p[k]};`);
  add('--color-transparent: transparent;');
  add('--color-current: currentColor;');
  add();
  add('--font-*: initial;');
  add(`--font-display: ${fontStack(t.display_family.name, t.display_family.fallback)};`);
  add(`--font-body: ${fontStack(t.body_family.name, t.body_family.fallback)};`);
  add(`--font-mono: ${fontStack(mono.name, mono.fallback)};`);
  add('--default-font-family: var(--font-body);');
  add('--default-mono-font-family: var(--font-mono);');
  add();
  add('/* Type roles: text-display sets size, line height, tracking and weight together. */');
  add('--text-*: initial;');
  for (const { role, style } of typeRoles(d)) {
    const n = kebab(role);
    const range = t.web_responsive?.[role];
    add(`--text-${n}: ${range ? fluid(range.min, range.max) : rem(style.size)};`);
    add(`--text-${n}--line-height: ${num(style.line_height / style.size)};`);
    add(`--text-${n}--letter-spacing: ${num(style.letter_spacing)}em;`);
    add(`--text-${n}--font-weight: ${style.weight};`);
  }
  add();
  add(
    `/* Spacing: only the ${d.spacing.base}px-grid scale. p-4 = ${rem(4 * d.spacing.base)}; off-grid values do not exist. */`,
  );
  add('--spacing-*: initial;');
  for (const s of spacingTokens(d)) add(`--spacing-${s.name}: ${rem(s.value)};`);
  add('--spacing-touch: 2.75rem; /* min-h-touch / size-touch: 44px minimum target */');
  add();
  add('--radius-*: initial;');
  for (const k of ['sm', 'md', 'lg'] as const) add(`--radius-${k}: ${rem(d.radius[k])};`);
  add('--radius-full: 9999px;');
  add();
  add('--shadow-*: initial;');
  for (const l of d.elevation.levels.filter((x) => x.shadow))
    add(`--shadow-${kebab(l.name)}: ${l.shadow};`);
  if (!d.permits?.blur) {
    add();
    add('/* No blur utilities: glassmorphism is not part of this direction. */');
    add('--blur-*: initial;');
  }
  add();
  add('--ease-*: initial;');
  add(`--ease-standard: ${d.motion.easing};`);
  return `@theme {\n${lines.join('\n')}\n}`;
}

/**
 * The full Tailwind entry stylesheet. `tokensPath` and `fontsPath` are relative to it.
 */
export function tailwindCss(
  d: Direction,
  opts: { tokensPath: string; fontsPath?: string | undefined; dark: boolean },
): string {
  const header = `${generatedHeader(d, '/*').replace(/\n\/\*/g, '\n *')}\n * Tailwind CSS v4 entry. Dark mode is handled by tokens.css; dark: is rarely needed.\n */`;
  const imports = [
    '@import "tailwindcss";',
    ...(opts.fontsPath ? [`@import "${opts.fontsPath}";`] : []),
    `@import "${opts.tokensPath}";`,
  ];
  const variant = opts.dark
    ? [
        '',
        '/* Matches the data-theme attribute that the no-flash snippet always sets. */',
        '@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));',
      ]
    : [];
  const utilities = typeRoles(d).map(
    ({ role, family }) =>
      `@utility t-${kebab(role)} {\n  font-family: var(--font-${family});\n  font-size: var(--text-${kebab(role)});\n  line-height: var(--text-${kebab(role)}--line-height);\n  letter-spacing: var(--text-${kebab(role)}--letter-spacing);\n  font-weight: var(--text-${kebab(role)}--font-weight);\n}`,
  );
  return [
    header,
    '',
    ...imports,
    ...variant,
    '',
    themeBlock(d),
    '',
    '/* Type role shortcuts: class="t-display" sets family, size, leading, tracking and weight. */',
    utilities.join('\n\n'),
    '',
  ].join('\n');
}

export const tailwindAdapter: Adapter = (d, o) => {
  const withFramework = o.together.includes('react') || o.together.includes('nextjs');
  const next = [
    'Tailwind v4 is configured in CSS (no tailwind.config.js). Use only theme utilities: bg-surface, text-text-muted, border-border, p-4, gap-6, rounded-md, shadow-overlay, text-body, font-display, or the t-display / t-body shortcuts.',
    'Arbitrary values such as bg-[#123456], text-[17px] or p-[13px] still compile in Tailwind and bypass the design system. Do not use them; review_ui flags them. Use min-h-touch or size-touch for 44px touch targets.',
  ];
  if (withFramework) {
    // React / Next.js adapters embed the Tailwind entry in their global stylesheet.
    return { files: [], next_steps: next };
  }
  // tokens.css and fonts.css are identical to the html adapter's; generateTheme de-duplicates.
  const files = [
    { path: 'css/tokens.css', content: tokensCss(d, o) },
    ...(o.fontSource === 'self-hosted'
      ? [{ path: 'css/fonts.css', content: fontFaceCss(d, '../fonts/') }]
      : []),
    {
      path: 'css/tailwind.css',
      content: tailwindCss(d, {
        tokensPath: './tokens.css',
        fontsPath: o.fontSource === 'self-hosted' ? './fonts.css' : undefined,
        dark: o.mode === 'both',
      }),
    },
  ];
  return {
    files,
    next_steps: [
      'Install and build: npm install tailwindcss @tailwindcss/cli, then npx @tailwindcss/cli -i css/tailwind.css -o css/output.css --minify (add --watch while developing). Link css/output.css in your HTML.',
      ...next,
    ],
  };
};
