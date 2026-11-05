// Source of truth for design direction files. The JSON Schema in
// direction.schema.json is generated from this file (npm run gen:schema).
import { z } from 'zod';

const hex = z.string().regex(/^#[0-9A-F]{6}$/, 'Use uppercase 6-digit hex, for example #0F6B4F');

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use a lowercase kebab-case id');

export const PaletteSchema = z
  .object({
    bg: hex.describe('Page / screen background'),
    surface: hex.describe('Cards, sheets, primary containers'),
    surface_alt: hex.describe('Secondary containers, filled inputs, table stripes'),
    text: hex.describe('Primary text. Must reach 4.5:1 on bg, surface and surface_alt'),
    text_muted: hex.describe('Secondary text. Must reach 4.5:1 on bg, surface and surface_alt'),
    border: hex.describe('Decorative hairlines and dividers (no contrast requirement)'),
    border_strong: hex.describe(
      'Boundaries that identify controls, such as input outlines. Must reach 3:1 on bg and surface',
    ),
    accent: hex.describe(
      'The single accent. 3:1 on bg and surface; 4.5:1 when no separate link color is set',
    ),
    on_accent: hex.describe('Text and icons on accent fills. Must reach 4.5:1 on accent'),
    link: hex
      .optional()
      .describe('Optional link text color, when accent is not dark/light enough for body links'),
    success: hex.describe('Meaning only. Must reach 4.5:1 on bg and surface'),
    warning: hex.describe('Meaning only. Must reach 4.5:1 on bg and surface'),
    error: hex.describe('Meaning only. Must reach 4.5:1 on bg and surface'),
  })
  .strict();

export const FontFamilySchema = z
  .object({
    name: z.string().min(1),
    license: z.enum(['OFL-1.1', 'Apache-2.0', 'UFL-1.0', 'MIT']),
    source: z.enum(['google-fonts', 'fontsource', 'bundled']),
    weights: z
      .array(z.number().int().min(100).max(900))
      .min(1)
      .describe('Weights the direction uses'),
    fallback: z.array(z.string().min(1)).min(1),
    notes: z.string().optional(),
  })
  .strict();

export const TYPE_ROLES = [
  'display',
  'headline',
  'title',
  'body',
  'body_small',
  'label',
  'caption',
] as const;
export type TypeRole = (typeof TYPE_ROLES)[number];

export const TypeStyleSchema = z
  .object({
    size: z.number().min(10).max(120).describe('px on web (base 16), sp on Android'),
    weight: z.number().int().min(100).max(900),
    line_height: z.number().min(10).max(160).describe('Absolute line height, same unit as size'),
    letter_spacing: z.number().min(-0.1).max(0.2).describe('em'),
    family: z
      .enum(['display', 'body', 'mono'])
      .optional()
      .describe('Defaults: display/headline use display, others use body'),
  })
  .strict()
  .refine((s) => s.line_height >= s.size, { message: 'line_height must be >= size' });

export const DirectionSchema = z
  .object({
    $schema: z.string().optional(),
    id: slug,
    name: z.string().min(1),
    version: z.number().int().min(1),
    summary: z.string().min(10).max(240),
    best_for: z.array(z.string().min(1)).min(1),
    avoid_for: z.array(z.string().min(1)).min(1),
    mood: z.array(z.string().min(1)).min(1),
    color: z.object({ light: PaletteSchema, dark: PaletteSchema }).strict(),
    typography: z
      .object({
        display_family: FontFamilySchema,
        body_family: FontFamilySchema,
        mono_family: FontFamilySchema.optional(),
        scale: z.object(Object.fromEntries(TYPE_ROLES.map((r) => [r, TypeStyleSchema]))).strict(),
        web_responsive: z
          .partialRecord(
            z.enum(TYPE_ROLES),
            z.object({ min: z.number().min(10), max: z.number().max(160) }).strict(),
          )
          .optional()
          .describe('Fluid clamp() range (px) for web display sizes'),
        numerals: z
          .enum(['proportional', 'tabular'])
          .optional()
          .describe('Default numeral style for data and money values'),
      })
      .strict(),
    spacing: z
      .object({
        base: z.number().int().min(2).max(8),
        scale: z.array(z.number().int().min(0)).min(6).max(16),
      })
      .strict(),
    radius: z
      .object({
        sm: z.number().min(0),
        md: z.number().min(0),
        lg: z.number().min(0),
        full: z.number().min(0),
        usage: z.string().min(1),
      })
      .strict(),
    elevation: z
      .object({
        style: z.enum(['borders-first', 'soft-shadows', 'flat', 'outlined-bold']),
        levels: z
          .array(
            z
              .object({
                name: z.string().min(1),
                shadow: z.string().optional().describe('CSS box-shadow value (light theme)'),
                shadow_dark: z.string().optional().describe('CSS box-shadow value (dark theme)'),
                elevation_dp: z.number().min(0).max(24).describe('Android elevation'),
              })
              .strict(),
          )
          .min(1),
      })
      .strict(),
    motion: z
      .object({
        duration_ms: z
          .object({ fast: z.number().int(), base: z.number().int(), slow: z.number().int() })
          .strict(),
        easing: z
          .string()
          .regex(
            /^cubic-bezier\(\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*,\s*-?[\d.]+\s*\)$/,
            'Use cubic-bezier(x1, y1, x2, y2)',
          ),
        rules: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    iconography: z
      .object({
        style: z.string().min(1),
        recommended_sets: z.array(z.string().min(1)).min(1),
        never: z.array(z.string().min(1)).min(1),
      })
      .strict(),
    components: z
      .object({
        button: z.string().min(1),
        card: z.string().min(1),
        input: z.string().min(1),
        list: z.string().min(1),
      })
      .catchall(z.string().min(1)),
    signature_details: z.array(z.string().min(1)).min(1),
    avoid: z.array(z.string().min(1)).min(1),
    permits: z
      .object({
        gradients: z.boolean().optional(),
        blur: z.boolean().optional(),
        shadows_on_cards: z.boolean().optional(),
      })
      .strict()
      .optional()
      .describe('AI-look patterns this direction deliberately allows. All default to false.'),
  })
  .strict();

export type Palette = z.infer<typeof PaletteSchema>;
export type FontFamily = z.infer<typeof FontFamilySchema>;
export type TypeStyle = z.infer<typeof TypeStyleSchema>;
export type Direction = z.infer<typeof DirectionSchema> & {
  typography: { scale: Record<TypeRole, TypeStyle> };
};

/** Generates the contributor-facing JSON Schema. Output is deterministic. */
export function directionJsonSchema(): unknown {
  return z.toJSONSchema(DirectionSchema, { target: 'draft-2020-12', io: 'input' });
}
