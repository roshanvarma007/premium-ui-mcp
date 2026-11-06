// Source of truth for layout blueprint files (src/blueprints/*.json).
import { z } from 'zod';

export const BLUEPRINT_SURFACES = ['landing', 'app', 'game', 'dashboard', 'ecommerce'] as const;

const text = z.string().min(1);

export const BlueprintSectionSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    name: text,
    required: z.boolean(),
    purpose: text,
    guidance: z.array(text).min(1),
    copy: z
      .object({
        headline_max_words: z.number().int().positive().optional(),
        body_max_words: z.number().int().positive().optional(),
        notes: text.optional(),
      })
      .strict()
      .optional(),
    platform_notes: z
      .object({ web: text.optional(), android: text.optional() })
      .strict()
      .optional(),
  })
  .strict();

export const BlueprintSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(/^[a-z0-9-]+$/),
    surface: z.enum(BLUEPRINT_SURFACES),
    name: text,
    summary: text,
    principles: z.array(text).min(3),
    structure_note: text,
    sections: z.array(BlueprintSectionSchema).min(3),
    states: z
      .array(z.object({ name: text, guidance: text }).strict())
      .min(1)
      .describe('Non-happy-path states that are part of the design'),
    accessibility: z.array(text).min(2),
    avoid: z.array(text).min(2),
  })
  .strict()
  .superRefine((b, ctx) => {
    const ids = new Set<string>();
    for (const [i, s] of b.sections.entries()) {
      if (ids.has(s.id))
        ctx.addIssue({
          code: 'custom',
          path: ['sections', i, 'id'],
          message: `Duplicate section id ${s.id}`,
        });
      ids.add(s.id);
    }
  });

export type Blueprint = z.infer<typeof BlueprintSchema>;
export type BlueprintSection = z.infer<typeof BlueprintSectionSchema>;
