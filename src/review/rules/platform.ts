// Platform-specific rules: web core (HTML/CSS/JS), Tailwind, React, Next.js, Compose, XML.
import { WEB_PLATFORMS } from '../../platforms.js';
import { base, classLists, DEFAULT_PALETTE_RE } from '../scan/tailwind.js';
import {
  attr,
  hasAttr,
  isTokenFile,
  langOf,
  matches,
  openingTags,
  stripComments,
} from '../source.js';
import type { Finding, ReviewContext, Rule, Severity, SourceFile } from '../types.js';

type Check = (ctx: ReviewContext) => Finding[];

function rule(
  id: string,
  severity: Severity,
  platforms: Rule['platforms'],
  title: string,
  check: Check,
): Rule {
  return { id, severity, platforms, title, check };
}

const f = (
  rule: string,
  severity: Severity,
  file: string,
  line: number,
  message: string,
  fix: string,
): Finding => ({
  rule,
  severity,
  file,
  line,
  message,
  fix,
});

const code = (file: SourceFile) => stripComments(file.content, langOf(file.path));
const byLang = (ctx: ReviewContext, ...langs: string[]) =>
  ctx.files.filter((x) => langs.includes(langOf(x.path)));
const markup = (ctx: ReviewContext) =>
  byLang(ctx, 'html', 'js').filter(
    (x) => langOf(x.path) === 'html' || /\.[jt]sx$/.test(x.path) || /<[A-Za-z]/.test(x.content),
  );

// ---------------------------------------------------------------- web core

const focusOutline = rule(
  'focus-outline-removed',
  'warn',
  WEB_PLATFORMS,
  'Focus outline removed without replacement',
  (ctx) => {
    const all = ctx.files.map((x) => code(x)).join('\n');
    const hasReplacement = /:focus-visible|focus-visible:/.test(all);
    if (hasReplacement) return [];
    const out: Finding[] = [];
    for (const file of byLang(ctx, 'css', 'html', 'js')) {
      for (const { line } of matches(code(file), /outline\s*:\s*(none|0)\b|\boutline-none\b/)) {
        out.push(
          f(
            'focus-outline-removed',
            'warn',
            file.path,
            line,
            'Focus outline removed with no :focus-visible style anywhere. Keyboard users lose their place.',
            'Keep a visible focus ring: :focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }.',
          ),
        );
      }
    }
    return out;
  },
);

const htmlDocument = rule(
  'html-document-basics',
  'error',
  WEB_PLATFORMS,
  'Missing viewport or lang',
  (ctx) => {
    const out: Finding[] = [];
    for (const file of byLang(ctx, 'html', 'js')) {
      const c = code(file);
      if (!/<(html|Html)[\s>]/.test(c)) continue;
      const jsx = langOf(file.path) === 'js';
      // Next.js and other React frameworks add the viewport meta themselves.
      if (!jsx && !/<meta[^>]+name\s*=\s*["']viewport["']/i.test(c)) {
        out.push(
          f(
            'missing-viewport',
            'error',
            file.path,
            1,
            'No <meta name="viewport">: the page renders zoomed out on phones.',
            'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to <head>.',
          ),
        );
      }
      const html = /<(?:html|Html)\b([^>]*)>/.exec(c);
      if (html && !/\blang\s*=/.test(html[1]!)) {
        out.push(
          f(
            'missing-lang',
            'warn',
            file.path,
            1,
            '<html> has no lang attribute; screen readers guess the language.',
            'Add lang, for example <html lang="en">.',
          ),
        );
      }
    }
    return out;
  },
);

const imgAlt = rule('img-alt', 'warn', WEB_PLATFORMS, 'Image without alt text', (ctx) => {
  const out: Finding[] = [];
  for (const file of markup(ctx)) {
    for (const tag of openingTags(code(file))) {
      if ((tag.name === 'img' || tag.name === 'Image') && !hasAttr(tag.attrs, 'alt')) {
        out.push(
          f(
            'img-alt',
            'warn',
            file.path,
            tag.line,
            `<${tag.name}> without alt text.`,
            'Add alt describing the image, or alt="" if it is decorative.',
          ),
        );
      }
    }
  }
  return out;
});

const clickableDiv = rule(
  'clickable-non-interactive',
  'warn',
  WEB_PLATFORMS,
  'Click handler on a non-interactive element',
  (ctx) => {
    const out: Finding[] = [];
    for (const file of markup(ctx)) {
      for (const tag of openingTags(code(file))) {
        if (!/^(div|span|li|p|section|article|img)$/.test(tag.name)) continue;
        if (!/(?:^|\s)on[cC]lick\s*=/.test(tag.attrs)) continue;
        const role = hasAttr(tag.attrs, 'role');
        const focusable = /tab[iI]ndex\s*=/.test(tag.attrs);
        const keys = /on[kK]ey(Down|Up|Press)\s*=/.test(tag.attrs);
        if (role && focusable && keys) continue;
        out.push(
          f(
            'clickable-non-interactive',
            'warn',
            file.path,
            tag.line,
            `<${tag.name}> has a click handler but no role, tabIndex and keyboard handler.`,
            'Use a <button> (or <a href>) instead; it is focusable and keyboard-accessible for free.',
          ),
        );
      }
    }
    return out;
  },
);

const iconButton = rule(
  'icon-button-label',
  'warn',
  WEB_PLATFORMS,
  'Icon-only button without an accessible name',
  (ctx) => {
    const out: Finding[] = [];
    for (const file of markup(ctx)) {
      const c = code(file);
      for (const tag of openingTags(c)) {
        if (tag.selfClosing || (tag.name !== 'button' && tag.name !== 'Button')) continue;
        const line = tag.line;
        if (/aria-label(ledby)?\s*=|\btitle\s*=/.test(tag.attrs)) continue;
        const openEnd = c.indexOf('>', tag.index + tag.name.length + tag.attrs.length);
        const close = c.indexOf(`</${tag.name}>`, openEnd);
        if (openEnd === -1 || close === -1) continue;
        const inner = c.slice(openEnd + 1, close);
        const text = inner
          .replace(/<(svg|Icon\w*|\w+Icon)\b[\s\S]*?(<\/\1>|\/>)/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\{[^}]*\}/g, (s) => (/['"`]/.test(s) ? 'x' : ''))
          .trim();
        const hasLabelledChild = /visually-hidden|sr-only|aria-label/.test(inner);
        if (!text && !hasLabelledChild) {
          out.push(
            f(
              'icon-button-label',
              'warn',
              file.path,
              line,
              'Icon-only button with no accessible name.',
              'Add aria-label="What it does" to the <button>.',
            ),
          );
        }
      }
    }
    return out;
  },
);

const pxFontSize = rule(
  'px-font-size',
  'info',
  ['html', 'tailwind', 'react', 'nextjs'],
  'Fixed px font size',
  (ctx) => {
    return ctx.facts.fontSizes
      .filter((s) => /font-size:\s*\d*\.?\d+px/.test(s.raw) && langOf(s.file) !== 'js')
      .map((s) =>
        f(
          'px-font-size',
          'info',
          s.file,
          s.line,
          `${s.raw} is a fixed px size; the token scale uses rem so text respects user zoom settings.`,
          'Use var(--text-*) or a .t-* role class.',
        ),
      );
  },
);

const themeFlash = rule(
  'theme-flash',
  'warn',
  WEB_PLATFORMS,
  'Theme applied after first paint',
  (ctx) => {
    const out: Finding[] = [];
    const all = ctx.files.map((x) => code(x)).join('\n');
    // An inline script that reads the saved theme before paint, in any supplied file
    // (raw <script> in an HTML head, or dangerouslySetInnerHTML in a layout / _document).
    const definesNoFlash =
      /localStorage\.getItem\(\s*\\?['"]theme[\s\S]{0,300}data-theme|data-theme[\s\S]{0,300}localStorage\.getItem/.test(
        all,
      );
    const hasInlineScript =
      (/dangerouslySetInnerHTML/.test(all) && definesNoFlash) ||
      ctx.files.some((x) => {
        if (langOf(x.path) !== 'html') return false;
        const c = code(x);
        const head = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(c)?.[1] ?? '';
        const firstCss = head.search(/<link[^>]+stylesheet/i);
        const inline = head.search(
          /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?(data-theme|classList[\s\S]{0,40}dark)/i,
        );
        return inline !== -1 && (firstCss === -1 || inline < firstCss);
      });
    if (hasInlineScript) return [];
    for (const file of byLang(ctx, 'html', 'js')) {
      const c = code(file);
      const re =
        langOf(file.path) === 'js' && /useEffect/.test(c)
          ? /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]{0,400}?(documentElement\.(setAttribute\(\s*['"]data-theme|dataset\.theme|classList\.(add|toggle)\(\s*['"]dark))/
          : /(documentElement\.(setAttribute\(\s*['"]data-theme|dataset\.theme|classList\.(add|toggle)\(\s*['"]dark))/;
      for (const { line } of matches(c, re)) {
        out.push(
          f(
            'theme-flash',
            'warn',
            file.path,
            line,
            'The theme is applied after the page renders, so users see a flash of the wrong theme.',
            'Set data-theme in an inline <script> in <head> before any stylesheet (get_theme_code generates it), then keep this code only for toggling.',
          ),
        );
        break;
      }
    }
    return out;
  },
);

const reducedMotion = rule(
  'reduced-motion',
  'warn',
  WEB_PLATFORMS,
  'Animation ignores prefers-reduced-motion',
  (ctx) => {
    const all = ctx.files.map((x) => code(x)).join('\n');
    if (/prefers-reduced-motion|useReducedMotion|motion-reduce:|motion-safe:/.test(all)) return [];
    const out: Finding[] = [];
    for (const file of ctx.files) {
      if (isTokenFile(file.path, file.content)) continue;
      const c = code(file);
      const re =
        langOf(file.path) === 'js'
          ? /<motion\.\w+|\banimate\s*=\s*\{|@keyframes|\banimate-(spin|ping|bounce|pulse)\b/
          : /@keyframes|\banimation\s*:|\banimate-(spin|ping|bounce|pulse)\b/;
      for (const { line } of matches(c, re)) {
        out.push(
          f(
            'reduced-motion',
            'warn',
            file.path,
            line,
            'Animation runs even when the user asked the system to reduce motion.',
            'Wrap it in @media (prefers-reduced-motion: no-preference), use motion-safe: / motion-reduce: variants, or check useReducedMotion().',
          ),
        );
        break;
      }
    }
    return out;
  },
);

// ---------------------------------------------------------------- Tailwind

const twArbitrary = rule(
  'tailwind-arbitrary-value',
  'warn',
  WEB_PLATFORMS,
  'Arbitrary value bypasses the theme',
  (ctx) => {
    const out: Finding[] = [];
    for (const file of markup(ctx)) {
      for (const list of classLists(file.path, code(file))) {
        for (const cls of list.classes) {
          const b = base(cls);
          if (
            /^[a-z-]+-\[[^\]]+\]$/.test(b) &&
            !/^(grid-cols|grid-rows|aspect|content|w|h|min-w|max-w|min-h|max-h|size|inset|top|left|right|bottom|z|translate-[xy]|duration|delay|ease)-\[/.test(
              b,
            ) &&
            !/-\[(var\(|--|#|rgb|hsl)/.test(b)
          ) {
            out.push(
              f(
                'tailwind-arbitrary-value',
                'warn',
                file.path,
                list.line,
                `Arbitrary value class "${cls}" bypasses the design tokens.`,
                'Use a theme utility (bg-surface, text-body, p-4, rounded-md) or add a token to the direction.',
              ),
            );
          }
        }
      }
    }
    return out;
  },
);

const twDefaultPalette = rule(
  'tailwind-default-palette',
  'warn',
  WEB_PLATFORMS,
  'Default Tailwind palette classes',
  (ctx) => {
    const out: Finding[] = [];
    for (const file of markup(ctx)) {
      for (const list of classLists(file.path, code(file))) {
        const hits = list.classes.filter((c) => DEFAULT_PALETTE_RE.test(base(c)));
        if (hits.length === 0) continue;
        const ai = hits.some((c) => /-(indigo|violet|purple|fuchsia)-/.test(c));
        if (!ai && !ctx.direction) continue;
        out.push(
          f(
            ai ? 'ai-palette' : 'tailwind-default-palette',
            'warn',
            file.path,
            list.line,
            `Default palette classes (${hits.slice(0, 3).join(' ')}) ${ai ? 'are the stock indigo/purple AI look' : 'ignore the direction palette'}.`,
            'Use direction color utilities: bg-bg, bg-surface, text-text, text-text-muted, bg-accent, text-on-accent, border-border.',
          ),
        );
      }
    }
    return out;
  },
);

// ---------------------------------------------------------------- Next.js

const nextRules = rule('nextjs', 'info', ['nextjs'], 'Next.js framework checks', (ctx) => {
  const out: Finding[] = [];
  for (const file of byLang(ctx, 'js')) {
    const c = code(file);
    for (const { line } of matches(
      c,
      /<link[^>]+href\s*=\s*["']https:\/\/fonts\.(googleapis|gstatic)\.com/,
    )) {
      out.push(
        f(
          'next-font-link',
          'info',
          file.path,
          line,
          'Fonts loaded with a raw <link> to Google Fonts.',
          'Use next/font/local (or next/font/google, which self-hosts at build time) and expose a CSS variable.',
        ),
      );
    }
    if (/\.[jt]sx$/.test(file.path)) {
      for (const tag of openingTags(c)) {
        if (tag.name === 'img') {
          out.push(
            f(
              'next-img',
              'info',
              file.path,
              tag.line,
              'Plain <img> in a Next.js component.',
              'Use next/image for content images (sizing, lazy loading, formats).',
            ),
          );
        }
      }
    }
    const p = file.path.replace(/\\/g, '/');
    if (/(^|\/)app\/(layout|page|template)\.[jt]sx?$/.test(p) && /^\s*['"]use client['"]/.test(c)) {
      out.push(
        f(
          'use-client-root',
          'info',
          file.path,
          1,
          `'use client' at the top of ${p.split('/').pop()} turns the whole tree into Client Components.`,
          'Keep the layout/page a Server Component and move interactivity into small client leaves.',
        ),
      );
    }
  }
  return out;
});

// ---------------------------------------------------------------- Compose

const composeRules = rule('compose', 'warn', ['compose'], 'Compose checks', (ctx) => {
  const out: Finding[] = [];
  for (const file of byLang(ctx, 'kotlin')) {
    if (isTokenFile(file.path, file.content)) continue;
    const c = code(file);
    for (const { m, line } of matches(c, /\bfontSize\s*=\s*\d+(?:\.\d+)?\.sp\b/)) {
      out.push(
        f(
          'compose-literal-font-size',
          'warn',
          file.path,
          line,
          `${m[0]} hardcodes a text size in screen code.`,
          'Use a role: style = AppTheme.type.body (or MaterialTheme.typography.*).',
        ),
      );
    }
    for (const { m, line } of matches(c, /\bRoundedCornerShape\(\s*\d+(?:\.\d+)?\.dp\s*\)/)) {
      out.push(
        f(
          'compose-literal-radius',
          'info',
          file.path,
          line,
          `${m[0]} hardcodes a corner radius.`,
          'Use AppTheme.shapes.sm / md / lg.',
        ),
      );
    }
    for (const { m, line } of matches(c, /\bpadding\(([^()]*\d+(?:\.\d+)?\.dp[^()]*)\)/)) {
      out.push(
        f(
          'compose-literal-padding',
          'info',
          file.path,
          line,
          `padding(${m[1]}) uses dp literals.`,
          'Use Spacing.sN tokens, for example Modifier.padding(Spacing.s4).',
        ),
      );
    }
    for (const { line } of matches(c, /\b(dynamicLightColorScheme|dynamicDarkColorScheme)\b/)) {
      out.push(
        f(
          'compose-dynamic-color',
          'warn',
          file.path,
          line,
          'Dynamic color (Material You) replaces the direction palette with wallpaper colors.',
          'Remove dynamic color and use the generated AppTheme.',
        ),
      );
    }
    for (const { m, line } of matches(
      c,
      /\b(Purple80|PurpleGrey80|Pink80|Purple40|PurpleGrey40|Pink40)\b/,
    )) {
      out.push(
        f(
          'ai-palette',
          'warn',
          file.path,
          line,
          `${m[1]} is the Android Studio template color scheme.`,
          'Replace the template theme with get_theme_code output for your direction.',
        ),
      );
    }
    for (const { line } of matches(c, /\bMaterialTheme(?:\(\s*(?:content\s*=|\{|\))|\s*\{)/)) {
      out.push(
        f(
          'compose-default-theme',
          'warn',
          file.path,
          line,
          'MaterialTheme without a colorScheme falls back to the baseline purple scheme.',
          'Wrap the UI in the generated AppTheme { ... }.',
        ),
      );
    }
  }
  return out;
});

// ---------------------------------------------------------------- Android XML

const xmlRules = rule('android-xml', 'warn', ['android-xml'], 'Android XML checks', (ctx) => {
  const out: Finding[] = [];
  for (const file of byLang(ctx, 'xml')) {
    const c = code(file);
    for (const { m, line } of matches(
      c,
      /<color\s+name\s*=\s*"(purple_200|purple_500|purple_700|teal_200|teal_700)"/,
    )) {
      out.push(
        f(
          'ai-palette',
          'warn',
          file.path,
          line,
          `${m[1]} is an Android Studio template color.`,
          'Replace template colors with the generated ds_* colors.',
        ),
      );
    }
    for (const { m, line } of matches(
      c,
      /@color\/(purple_200|purple_500|purple_700|teal_200|teal_700)\b/,
    )) {
      out.push(
        f(
          'ai-palette',
          'warn',
          file.path,
          line,
          `Theme still references template color @color/${m[1]}.`,
          'Map theme attributes to @color/ds_* from the generated colors.xml.',
        ),
      );
    }
    if (isTokenFile(file.path, file.content)) continue;
    for (const tag of openingTags(c)) {
      const size = attr(tag.attrs, 'android:textSize');
      if (size && /^\d+(\.\d+)?(dp|px|dip)$/.test(size)) {
        out.push(
          f(
            'xml-text-size-unit',
            'warn',
            file.path,
            tag.line,
            `android:textSize="${size}" ignores the user's font scale.`,
            'Use a TextAppearance (sizes are in sp) instead of textSize in layouts.',
          ),
        );
      } else if (size && /^\d/.test(size)) {
        out.push(
          f(
            'xml-literal-text-size',
            'info',
            file.path,
            tag.line,
            `android:textSize="${size}" hardcodes a size in a layout.`,
            'Use android:textAppearance="?attr/textAppearanceBodyLarge" (or another role).',
          ),
        );
      }
      const font = attr(tag.attrs, 'android:fontFamily');
      if (font && !/^(@font\/|\?attr\/|\?)/.test(font)) {
        out.push(
          f(
            'xml-font-resource',
            'warn',
            file.path,
            tag.line,
            `android:fontFamily="${font}" does not come from the generated font resources.`,
            'Rely on the theme font or use @font/<family>_<weight>.',
          ),
        );
      }
      const appearance = attr(tag.attrs, 'android:textAppearance');
      if (
        appearance &&
        !/^(\?attr\/textAppearance|@style\/TextAppearance\.App\.)/.test(appearance)
      ) {
        out.push(
          f(
            'xml-text-appearance',
            'info',
            file.path,
            tag.line,
            `textAppearance "${appearance}" is not one of the direction roles.`,
            'Use ?attr/textAppearance* or @style/TextAppearance.App.*.',
          ),
        );
      }
    }
  }
  return out;
});

export const PLATFORM_RULES: readonly Rule[] = [
  focusOutline,
  htmlDocument,
  imgAlt,
  clickableDiv,
  iconButton,
  pxFontSize,
  themeFlash,
  reducedMotion,
  twArbitrary,
  twDefaultPalette,
  nextRules,
  composeRules,
  xmlRules,
];
