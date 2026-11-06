// Quality checks that go beyond the zod shape: WCAG contrast for every pair a
// direction's tokens are meant to be used in, plus internal consistency.
import { AA_LARGE, AA_NORMAL, contrastHex, floorRatio } from '../a11y/contrast.js';
import {
  type Direction,
  DirectionSchema,
  type Palette,
  TYPE_ROLES,
} from '../schema/direction.schema.js';

export interface ContrastPair {
  mode: 'light' | 'dark';
  fg: keyof Palette;
  bg: keyof Palette;
  min: number;
  ratio: number;
  pass: boolean;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

const TEXT_BGS = ['bg', 'surface', 'surface_alt'] as const;
const PAGE_BGS = ['bg', 'surface'] as const;

/** Every (foreground, background, minimum) pair a palette promises to support. */
export function contrastRequirements(p: Palette): Array<[keyof Palette, keyof Palette, number]> {
  const req: Array<[keyof Palette, keyof Palette, number]> = [];
  for (const bg of TEXT_BGS) {
    req.push(['text', bg, AA_NORMAL], ['text_muted', bg, AA_NORMAL]);
  }
  req.push(['on_accent', 'accent', AA_NORMAL]);
  for (const bg of PAGE_BGS) {
    req.push(['accent', bg, p.link ? AA_LARGE : AA_NORMAL]);
    if (p.link) req.push(['link', bg, AA_NORMAL]);
    req.push(['border_strong', bg, AA_LARGE]);
    req.push(['success', bg, AA_NORMAL], ['warning', bg, AA_NORMAL], ['error', bg, AA_NORMAL]);
  }
  return req;
}

export function contrastReport(direction: Direction): ContrastPair[] {
  const out: ContrastPair[] = [];
  for (const mode of ['light', 'dark'] as const) {
    const p = direction.color[mode];
    for (const [fg, bg, min] of contrastRequirements(p)) {
      const ratio = floorRatio(contrastHex(p[fg]!, p[bg]!));
      out.push({ mode, fg, bg, min, ratio, pass: ratio >= min });
    }
  }
  return out;
}

/** Validates shape (zod) and quality rules. Returns an empty list when the direction is valid. */
export function validateDirection(input: unknown): ValidationIssue[] {
  const parsed = DirectionSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  }
  const d = parsed.data as Direction;
  const issues: ValidationIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });

  for (const c of contrastReport(d)) {
    if (!c.pass) {
      add(
        `color.${c.mode}.${c.fg}`,
        `${c.fg} on ${c.bg} is ${c.ratio}:1, needs ${c.min}:1 (WCAG AA)`,
      );
    }
  }

  for (const mode of ['light', 'dark'] as const) {
    const p = d.color[mode];
    if (p.text === '#000000' && (p.bg === '#FFFFFF' || p.surface === '#FFFFFF')) {
      add(`color.${mode}.text`, 'Pure #000000 on #FFFFFF; use tinted neutrals');
    }
  }
  if (JSON.stringify(d.color.light) === JSON.stringify(d.color.dark)) {
    add('color.dark', 'Dark palette must be designed separately, not copied from light');
  }

  // Fonts: every weight used by the scale must be declared on its family.
  const families = {
    display: d.typography.display_family,
    body: d.typography.body_family,
    mono: d.typography.mono_family,
  };
  for (const role of TYPE_ROLES) {
    const style = d.typography.scale[role];
    const familyKey =
      style.family ?? (role === 'display' || role === 'headline' ? 'display' : 'body');
    const family = families[familyKey];
    if (!family) {
      add(`typography.scale.${role}.family`, `Uses ${familyKey} family, which is not defined`);
      continue;
    }
    if (!family.weights.includes(style.weight)) {
      add(
        `typography.scale.${role}.weight`,
        `Weight ${style.weight} is not listed in ${family.name} weights [${family.weights.join(', ')}]`,
      );
    }
  }
  const sizes = new Set(TYPE_ROLES.map((r) => d.typography.scale[r].size));
  if (sizes.size > 7) add('typography.scale', 'More than 7 distinct font sizes');
  for (const [role, range] of Object.entries(d.typography.web_responsive ?? {})) {
    if (range.min > range.max) add(`typography.web_responsive.${role}`, 'min is greater than max');
  }

  // Spacing: ascending, starting at 0, on the base grid.
  const { base, scale } = d.spacing;
  if (scale[0] !== 0) add('spacing.scale', 'Scale must start with 0');
  scale.forEach((v, i) => {
    if (i > 0 && v <= scale[i - 1]!) add(`spacing.scale.${i}`, 'Scale must be strictly ascending');
    if (v % base !== 0) add(`spacing.scale.${i}`, `${v} is not a multiple of base ${base}`);
  });

  const { sm, md, lg } = d.radius;
  if (!(sm <= md && md <= lg)) add('radius', 'Radii must satisfy sm <= md <= lg');

  const { fast, base: mid, slow } = d.motion.duration_ms;
  if (!(fast < mid && mid < slow))
    add('motion.duration_ms', 'Durations must satisfy fast < base < slow');

  if (d.elevation.levels[0]?.elevation_dp !== 0) {
    add('elevation.levels.0', 'The first elevation level must be flat (elevation_dp 0)');
  }

  return issues;
}
