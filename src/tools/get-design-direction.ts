import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { matchBrief, type ScoredDirection } from '../brief/match.js';
import { getDirection, getDirections } from '../directions/index.js';
import { PlatformSchema, SurfaceSchema } from '../platforms.js';
import { json, ok } from './result.js';

export const GetDesignDirectionInput = z.object({
  product_type: z
    .string()
    .min(1)
    .max(200)
    .describe(
      'What is being built, for example "personal budgeting app" or "jewelry e-commerce site"',
    ),
  audience: z
    .string()
    .max(200)
    .optional()
    .describe('Who it is for, for example "first-time investors"'),
  feelings: z
    .array(z.string().max(40))
    .max(6)
    .optional()
    .describe('2 or 3 words for the desired feeling, for example ["calm", "trustworthy"]'),
  platform: PlatformSchema.describe('Target platform id, detected from the project'),
  surface: SurfaceSchema.optional().describe('Primary surface being designed'),
  constraints: z
    .array(z.string().max(200))
    .max(10)
    .optional()
    .describe('Hard constraints to respect, for example "must support dark mode"'),
});

function reason(s: ScoredDirection): string {
  const parts = [...s.matched];
  if (s.conflicts.length > 0) parts.push(`but ${s.conflicts.join('; ')}`);
  return parts.length > 0 ? parts.join('; ') : 'weak match';
}

export function getDesignDirection(brief: z.infer<typeof GetDesignDirectionInput>) {
  const result = matchBrief(getDirections(), brief);
  if (result.status === 'needs_clarification') {
    const questions = result.questions;
    const text = [
      'status: needs_clarification',
      'The brief is too vague to choose a direction with confidence. Ask the user these questions in one short message, then call get_design_direction again:',
      ...questions.map((q, i) => `${i + 1}. ${q}`),
      '',
      `Available directions: ${getDirections()
        .map((d) => d.id)
        .join(', ')}.`,
    ].join('\n');
    return ok(text, { status: 'needs_clarification', questions });
  }

  const [top, ...rest] = result.ranked;
  const direction = getDirection(top!.id)!;
  const alternates = rest
    .filter((s) => s.score > 0)
    .slice(0, 2)
    .map((s) => ({ id: s.id, name: getDirection(s.id)!.name, reason: reason(s) }));
  const why = `${direction.name} fits because it is ${reason(top!)}.`;
  const constraints = brief.constraints ?? [];

  const text = [
    `## Recommended direction: ${direction.name} (\`${direction.id}\`)`,
    '',
    `Why this fits: ${why} ${direction.summary}`,
    '',
    alternates.length > 0
      ? `Alternates:\n${alternates.map((a) => `- ${a.name} (\`${a.id}\`): ${a.reason}`).join('\n')}`
      : 'Alternates: none of the other shipped directions fit this brief.',
    ...(constraints.length > 0
      ? [
          '',
          `User constraints to respect on top of this direction:\n${constraints.map((c) => `- ${c}`).join('\n')}`,
        ]
      : []),
    '',
    `Next: call get_theme_code with direction_id "${direction.id}" and platform "${brief.platform}". Write the theme files first, then build screens using only those tokens. Honor every item in "avoid" and "components".`,
    '',
    json(direction),
  ].join('\n');

  return ok(text, { status: 'ok', direction_id: direction.id, alternates, why });
}

export function registerGetDesignDirection(server: McpServer): void {
  server.registerTool(
    'get_design_direction',
    {
      title: 'Choose a design direction for a brief',
      description:
        'Call this FIRST, before writing any UI code, whenever the user asks to design, build, restyle or theme an app, website, landing page, dashboard, store or game UI. Pass the brief (product type, audience, feelings, platform). Returns one complete design direction (light and dark palettes, typography, spacing, radius, elevation, motion, component rules, things to avoid) plus up to 2 alternates. If the brief is too vague it returns status "needs_clarification" with up to 4 questions: ask the user, then call again. Next step: get_theme_code with the chosen direction_id.',
      inputSchema: GetDesignDirectionInput,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (brief) => getDesignDirection(brief),
  );
}
