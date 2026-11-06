// Cross-platform rules evaluated on normalized facts.
import {
  contrastHex,
  floorRatio,
  isLargeText,
  nearestPassingForeground,
} from '../../a11y/contrast.js';
import { spacingTokens } from '../../adapters/model.js';
import { AI_DEFAULT_COLORS, hueFamily, hueOf, isNavy, SEMANTIC_FAMILIES } from '../colors.js';
import type { Finding, Occ, ReviewContext, Rule, Severity } from '../types.js';

const unitOf = (ctx: ReviewContext) =>
  ctx.platform === 'compose' || ctx.platform === 'android-xml' ? 'dp' : 'px';
const textUnit = (ctx: ReviewContext) =>
  ctx.platform === 'compose' || ctx.platform === 'android-xml' ? 'sp' : 'px';

function finding(rule: string, severity: Severity, at: Occ, message: string, fix: string): Finding {
  return { rule, severity, file: at.file, line: at.line, message, fix };
}

function tokenHint(ctx: ReviewContext, kind: 'color' | 'space' | 'radius' | 'type'): string {
  switch (ctx.platform) {
    case 'compose':
      return {
        color: 'AppTheme.colors.*',
        space: 'Spacing.sN',
        radius: 'AppTheme.shapes.sm/md/lg',
        type: 'AppTheme.type.* styles',
      }[kind];
    case 'android-xml':
      return {
        color: '@color/ds_* or ?attr/color*',
        space: '@dimen/ds_space_N',
        radius: '@dimen/ds_radius_* or ShapeAppearance.App.*',
        type: '?attr/textAppearance* or @style/TextAppearance.App.*',
      }[kind];
    default:
      return {
        color: 'var(--color-*) or theme classes like bg-surface / text-text-muted',
        space: 'var(--spacing-N) or spacing classes like p-4 / gap-6',
        radius: 'var(--radius-sm|md|lg) or rounded-sm/md/lg',
        type: 'the .t-* role classes, var(--text-*) or text-body / t-title utilities',
      }[kind];
  }
}

const contrastFail: Rule = {
  id: 'contrast-fail',
  severity: 'error',
  platforms: 'all',
  title: 'Text/background pair fails WCAG AA',
  check(ctx) {
    return ctx.facts.textOnBackground.flatMap((p) => {
      const ratio = floorRatio(contrastHex(p.fg, p.bg));
      const large = p.sizePx !== undefined && isLargeText(p.sizePx, p.bold ?? false);
      const min = large ? 3 : 4.5;
      if (ratio >= min) return [];
      const fix = nearestPassingForeground(p.fg, p.bg, min);
      return [
        finding(
          'contrast-fail',
          'error',
          p,
          `${p.fg} on ${p.bg} is ${ratio}:1; WCAG AA needs ${min}:1${large ? ' for large text' : ''}.`,
          fix
            ? `Use the direction's text / text_muted tokens, or a foreground like ${fix} that reaches ${min}:1.`
            : 'Change the background; no foreground with this hue reaches AA on it.',
        ),
      ];
    });
  },
};

const hardcodedColor: Rule = {
  id: 'hardcoded-color',
  severity: 'warn',
  platforms: 'all',
  title: 'Color literal outside the token files',
  check(ctx) {
    return ctx.facts.colors.map((c) =>
      finding(
        'hardcoded-color',
        'warn',
        c,
        `Hardcoded color ${c.raw} in screen code. It will drift from the system and break dark mode.`,
        `Reference a token instead: ${tokenHint(ctx, 'color')}.`,
      ),
    );
  },
};

const pureBlackWhite: Rule = {
  id: 'pure-black-white',
  severity: 'warn',
  platforms: 'all',
  title: 'Pure #000 on #FFF',
  check(ctx) {
    return ctx.facts.textOnBackground
      .filter((p) => p.fg === '#000000' && p.bg === '#FFFFFF')
      .map((p) =>
        finding(
          'pure-black-white',
          'warn',
          p,
          'Pure black text on pure white feels harsh and causes glare.',
          `Use tinted neutrals from the direction (text on bg/surface): ${tokenHint(ctx, 'color')}.`,
        ),
      );
  },
};

const tooManyAccents: Rule = {
  id: 'too-many-accents',
  severity: 'warn',
  platforms: 'all',
  title: 'More than one accent hue family',
  check(ctx) {
    const directionHexes = new Set(
      ctx.direction
        ? [...Object.values(ctx.direction.color.light), ...Object.values(ctx.direction.color.dark)]
        : [],
    );
    const firstByFamily = new Map<string, Occ & { hex: string }>();
    for (const c of ctx.facts.allColors) {
      if (c.alpha < 0.5 || directionHexes.has(c.hex)) continue;
      const h = hueOf(c.hex);
      if (h.hue === null || h.chroma < 0.08 || h.lightness < 0.25 || h.lightness > 0.93) continue;
      const fam = hueFamily(h.hue);
      if (SEMANTIC_FAMILIES.has(fam)) continue;
      if (!firstByFamily.has(fam)) firstByFamily.set(fam, c);
    }
    if (ctx.direction) {
      const accent = hueOf(ctx.direction.color.light.accent);
      if (accent.hue !== null) firstByFamily.delete(hueFamily(accent.hue));
      const limit = 0;
      if (firstByFamily.size <= limit) return [];
    } else if (firstByFamily.size <= 1) return [];
    const families = [...firstByFamily.entries()];
    const [, at] = families[ctx.direction ? 0 : 1]!;
    return [
      finding(
        'too-many-accents',
        'warn',
        at,
        `Several accent hue families in use (${families.map(([f]) => f).join(', ')}). Premium interfaces commit to one accent.`,
        'Keep exactly one accent color family; use neutrals for structure and semantic colors only for meaning.',
      ),
    ];
  },
};

const aiPalette: Rule = {
  id: 'ai-palette',
  severity: 'warn',
  platforms: 'all',
  title: 'Default or "AI-look" palette',
  check(ctx) {
    const out: Finding[] = [];
    const seen = new Set<string>();
    for (const c of ctx.facts.allColors) {
      const name = AI_DEFAULT_COLORS[c.hex];
      const key = `${c.file}:${c.hex}`;
      if (!name || seen.has(key)) continue;
      seen.add(key);
      out.push(
        finding(
          'ai-palette',
          'warn',
          c,
          `${c.hex} is ${name}, a default that makes the UI look generated.`,
          'Use the palette of a chosen design direction (get_design_direction) instead of framework defaults.',
        ),
      );
    }
    const byFile = new Map<string, { navy?: Occ; cool?: Occ }>();
    for (const c of ctx.facts.allColors) {
      const entry = byFile.get(c.file) ?? {};
      const h = hueOf(c.hex);
      if (isNavy(c.hex)) entry.navy ??= c;
      else if (
        h.hue !== null &&
        h.chroma >= 0.1 &&
        ['cyan', 'indigo', 'violet', 'purple'].includes(hueFamily(h.hue))
      ) {
        entry.cool ??= c;
      }
      byFile.set(c.file, entry);
    }
    for (const [, e] of byFile) {
      if (e.navy && e.cool) {
        out.push(
          finding(
            'ai-palette',
            'warn',
            e.navy,
            'Navy background combined with cyan/purple accents: the most common AI-generated palette.',
            'Pick a direction whose palette fits the product (warm neutrals, ink, one considered accent).',
          ),
        );
      }
    }
    return out;
  },
};

const fontSizeSprawl: Rule = {
  id: 'font-size-sprawl',
  severity: 'warn',
  platforms: 'all',
  title: 'Too many distinct font sizes',
  check(ctx) {
    const sizes = new Map<number, Occ>();
    for (const s of ctx.facts.fontSizes) {
      const key = Math.round(s.px * 2) / 2;
      if (!sizes.has(key)) sizes.set(key, s);
    }
    if (sizes.size <= 7) return [];
    const at = [...sizes.values()][7]!;
    return [
      finding(
        'font-size-sprawl',
        'warn',
        at,
        `${sizes.size} distinct font sizes (${[...sizes.keys()].sort((a, b) => a - b).join(', ')}${textUnit(ctx)}). A type system needs 7 or fewer.`,
        `Map every text to one of the 7 roles: ${tokenHint(ctx, 'type')}.`,
      ),
    ];
  },
};

const tinyText: Rule = {
  id: 'tiny-text',
  severity: 'warn',
  platforms: 'all',
  title: 'Text smaller than 12',
  check(ctx) {
    return ctx.facts.fontSizes
      .filter((s) => s.px < 12)
      .map((s) =>
        finding(
          'tiny-text',
          'warn',
          s,
          `Text at ${s.px}${textUnit(ctx)} is too small to read comfortably (minimum 12${textUnit(ctx)}, except legal fine print).`,
          `Use the caption or label role (12${textUnit(ctx)}) at the smallest.`,
        ),
      );
  },
};

const offGridSpacing: Rule = {
  id: 'off-grid-spacing',
  severity: 'warn',
  platforms: 'all',
  title: 'Spacing off the grid',
  check(ctx) {
    const scale = ctx.direction ? new Set(ctx.direction.spacing.scale) : undefined;
    const base = ctx.direction?.spacing.base ?? 4;
    return ctx.facts.spacing
      .filter((s) => {
        if (s.px <= 2) return false;
        if (!Number.isInteger(s.px)) return true;
        return scale ? !scale.has(s.px) : s.px % base !== 0;
      })
      .map((s) => {
        const options = ctx.direction
          ? spacingTokens(ctx.direction).map((t) => t.value)
          : [s.px - (s.px % base), s.px - (s.px % base) + base];
        const nearest = options.reduce((a, b) => (Math.abs(b - s.px) < Math.abs(a - s.px) ? b : a));
        return finding(
          'off-grid-spacing',
          'warn',
          s,
          `Spacing ${s.raw} is off the ${ctx.direction ? 'direction scale' : `${base}${unitOf(ctx)} grid`}.`,
          `Use ${nearest}${unitOf(ctx)} via ${tokenHint(ctx, 'space')}.`,
        );
      });
  },
};

const radiusSprawl: Rule = {
  id: 'radius-sprawl',
  severity: 'warn',
  platforms: 'all',
  title: 'Too many distinct corner radii',
  check(ctx) {
    const radii = new Map<number, Occ>();
    for (const r of ctx.facts.radii) if (r.px !== 'full' && !radii.has(r.px)) radii.set(r.px, r);
    if (radii.size <= 3) return [];
    return [
      finding(
        'radius-sprawl',
        'warn',
        [...radii.values()][3]!,
        `${radii.size} distinct corner radii (${[...radii.keys()].sort((a, b) => a - b).join(', ')}${unitOf(ctx)}). Use at most 3.`,
        `Use only the sm / md / lg radii: ${tokenHint(ctx, 'radius')}.`,
      ),
    ];
  },
};

const uniformPill: Rule = {
  id: 'uniform-pill-everything',
  severity: 'warn',
  platforms: 'all',
  title: 'Everything fully rounded',
  check(ctx) {
    const all = ctx.facts.radii;
    const pills = all.filter((r) => r.px === 'full' || r.px >= 24);
    if (pills.length < 4 || pills.length / all.length < 0.6) return [];
    return [
      finding(
        'uniform-pill-everything',
        'warn',
        pills[0]!,
        `${pills.length} of ${all.length} radii are pill-shaped or 24+${unitOf(ctx)}. Containers, buttons and inputs become indistinguishable.`,
        'Reserve full rounding for chips and avatars; use the md radius for buttons and cards.',
      ),
    ];
  },
};

const shadowEverywhere: Rule = {
  id: 'shadow-everywhere',
  severity: 'warn',
  platforms: 'all',
  title: 'Shadows on most containers',
  check(ctx) {
    const s = ctx.facts.shadows;
    if (s.length < 5) return [];
    return [
      finding(
        'shadow-everywhere',
        'warn',
        s[4]!,
        `${s.length} shadow / elevation declarations. When everything floats, nothing does.`,
        'Separate with spacing and hairline borders; keep elevation for overlays and interactive layers.',
      ),
    ];
  },
};

const simple = (
  id: string,
  title: string,
  pick: (ctx: ReviewContext) => Occ[],
  message: (o: Occ) => string,
  fix: string,
  allowedBy?: 'gradients' | 'blur',
): Rule => ({
  id,
  severity: 'warn',
  platforms: 'all',
  title,
  check(ctx) {
    if (allowedBy && ctx.direction?.permits?.[allowedBy]) return [];
    return pick(ctx).map((o) => finding(id, 'warn', o, message(o), fix));
  },
});

const gradientUsage = simple(
  'gradient-usage',
  'Decorative gradient',
  (c) => c.facts.gradients,
  (o) => `Gradient (${o.raw}): the strongest single tell of AI-generated UI.`,
  'Use a flat surface or accent token; create emphasis with size, weight and whitespace.',
  'gradients',
);

const glassmorphism = simple(
  'glassmorphism',
  'Blur / glassmorphism',
  (c) => c.facts.glass,
  (o) =>
    `Blur effect (${o.raw}) used as glassmorphism. It hurts legibility and reads as a template.`,
  'Use opaque surface / surface_alt tokens separated by a hairline border.',
  'blur',
);

const glowShadow = simple(
  'glow-shadow',
  'Colored glow shadow',
  (c) => c.facts.glows,
  (o) => `Colored glow shadow (${o.raw}).`,
  'Use the neutral elevation tokens of the direction, or a border.',
);

const emojiAsIcon = simple(
  'emoji-as-icon',
  'Emoji used as icons',
  (c) => c.facts.emoji,
  (o) => `Emoji "${o.raw}" in UI text. Emoji render differently per platform and cannot be themed.`,
  'Use one icon set in one style (for example Lucide or Material Symbols) sized on the grid.',
);

const lowTouchTarget: Rule = {
  id: 'low-touch-target',
  severity: 'warn',
  platforms: 'all',
  title: 'Touch target too small',
  check(ctx) {
    const min = ctx.platform === 'compose' || ctx.platform === 'android-xml' ? 48 : 44;
    return ctx.facts.touchTargets
      .filter((t) => t.px < min)
      .map((t) =>
        finding(
          'low-touch-target',
          'warn',
          t,
          `Interactive element is ${t.px}${unitOf(ctx)} high (${t.raw}); minimum is ${min}${unitOf(ctx)}.`,
          ctx.platform === 'compose'
            ? 'Use Spacing.minTouchTarget (48dp) or Modifier.minimumInteractiveComponentSize().'
            : ctx.platform === 'android-xml'
              ? 'Set android:minHeight="@dimen/ds_touch_target" (48dp).'
              : 'Use min-height: var(--size-touch) (44px) or the min-h-touch utility.',
        ),
      );
  },
};

const defaultFontFallthrough = simple(
  'default-font-fallthrough',
  'Default font in place of the direction fonts',
  (c) => c.facts.defaultFonts,
  (o) => `Default font (${o.raw}) instead of the direction's typefaces.`,
  'Use the generated font tokens: var(--font-body) / font-body, AppTheme.type, or @font resources.',
);

export const COMMON_RULES: readonly Rule[] = [
  contrastFail,
  hardcodedColor,
  tooManyAccents,
  pureBlackWhite,
  fontSizeSprawl,
  offGridSpacing,
  radiusSprawl,
  defaultFontFallthrough,
  emojiAsIcon,
  tinyText,
  lowTouchTarget,
  gradientUsage,
  glassmorphism,
  glowShadow,
  aiPalette,
  shadowEverywhere,
  uniformPill,
];
