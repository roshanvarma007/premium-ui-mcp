import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getBlueprint, getBlueprints } from '../blueprints/index.js';
import { RUBRIC, rubricMaxScore } from '../data/rubric.js';
import { getDirection, getDirections } from '../directions/index.js';
import type { Blueprint } from '../schema/blueprint.schema.js';
import type { Direction } from '../schema/direction.schema.js';
import { fail, ok } from './result.js';

function directionNotes(d: Direction): string[] {
  return [
    `Buttons: ${d.components.button}`,
    `Cards: ${d.components.card}`,
    `Inputs: ${d.components.input}`,
    `Lists: ${d.components.list}`,
    `Radii: ${d.radius.usage}`,
    `Signature details: ${d.signature_details.join('; ')}.`,
    `Never in this direction: ${d.avoid.join(', ')}.`,
  ];
}

export function blueprintText(b: Blueprint, d: Direction): string {
  const sections = b.sections.map((s, i) => {
    const copy = s.copy
      ? `\n   Copy: ${[
          s.copy.headline_max_words ? `headline up to ${s.copy.headline_max_words} words` : '',
          s.copy.body_max_words ? `body up to ${s.copy.body_max_words} words` : '',
          s.copy.notes ?? '',
        ]
          .filter(Boolean)
          .join('; ')}`
      : '';
    const notes = s.platform_notes
      ? Object.entries(s.platform_notes)
          .map(([k, v]) => `\n   ${k === 'web' ? 'Web' : 'Android'}: ${v}`)
          .join('')
      : '';
    return `${i + 1}. **${s.name}**${s.required ? '' : ' (optional)'}: ${s.purpose}\n${s.guidance.map((g) => `   - ${g}`).join('\n')}${copy}${notes}`;
  });
  return [
    `# ${b.name} blueprint, styled with ${d.name}`,
    '',
    b.summary,
    '',
    '## Principles',
    ...b.principles.map((p) => `- ${p}`),
    '',
    `## Structure\n${b.structure_note}`,
    '',
    '## Sections, in order',
    ...sections,
    '',
    '## States to design',
    ...b.states.map((s) => `- ${s.name}: ${s.guidance}`),
    '',
    '## Accessibility',
    ...b.accessibility.map((a) => `- ${a}`),
    '',
    '## Avoid',
    ...b.avoid.map((a) => `- ${a}`),
    '',
    `## ${d.name} specifics`,
    ...directionNotes(d).map((n) => `- ${n}`),
  ].join('\n');
}

export function registerBlueprintAndRubric(server: McpServer): void {
  server.registerTool(
    'get_layout_blueprint',
    {
      title: 'Get a layout blueprint for a surface',
      description:
        'Return the ordered structure and guidance for a surface type (landing page, mobile app screen, game UI, dashboard, e-commerce): sections in order with purpose, copy-length limits, platform notes, the states to design (empty, loading, error, offline, success), accessibility requirements and things to avoid, combined with the component rules of the chosen direction. Call it after get_design_direction and before laying out screens.',
      inputSchema: z.object({
        surface: z
          .string()
          .min(1)
          .max(40)
          .describe(
            'landing, app (mobile app screen), game, dashboard or ecommerce. Aliases like "landing-page" and "store" work.',
          ),
        direction_id: z.string().min(1).max(64).describe('Direction id from get_design_direction'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ surface, direction_id }) => {
      const blueprint = getBlueprint(surface);
      if (!blueprint) {
        return fail(
          `Unknown surface "${surface}". Use one of: ${getBlueprints()
            .map((b) => b.surface)
            .join(', ')}.`,
        );
      }
      const direction = getDirection(direction_id);
      if (!direction) {
        return fail(
          `Unknown direction "${direction_id}". Available: ${getDirections()
            .map((d) => d.id)
            .join(', ')}.`,
        );
      }
      return ok(blueprintText(blueprint, direction), {
        blueprint: blueprint as unknown as Record<string, unknown>,
        direction_notes: directionNotes(direction),
      });
    },
  );

  server.registerTool(
    'get_review_rubric',
    {
      title: 'Get the visual review rubric',
      description:
        'Return a checklist for reviewing a screenshot that you (the model) can see: focal point, hierarchy, spacing rhythm, alignment, contrast, density, color restraint, typography, consistency, AI-look tells, states and touch targets, each with pass and fail signals and a weight. The server does not analyze images. Use it whenever the user shares a screenshot of the UI, score each criterion 0-2, and report the lowest-scoring items with concrete fixes.',
      inputSchema: z.object({
        direction_id: z
          .string()
          .max(64)
          .optional()
          .describe('Adds direction-specific checks (signature details and avoid list)'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ direction_id }) => {
      const direction = direction_id ? getDirection(direction_id) : undefined;
      if (direction_id && !direction) return fail(`Unknown direction "${direction_id}".`);
      const lines = RUBRIC.map(
        (c, i) =>
          `${i + 1}. **${c.name}** (weight ${c.weight}): ${c.question}\n   Pass: ${c.pass.join('; ')}.\n   Fail: ${c.fail.join('; ')}.`,
      );
      const extra = direction
        ? [
            '',
            `## ${direction.name} checks`,
            ...direction.signature_details.map((s) => `- Present: ${s}`),
            ...direction.avoid.map((a) => `- Absent: ${a}`),
          ]
        : [];
      const text = [
        '# Screenshot review rubric',
        'Score each criterion 0 (fails), 1 (partly) or 2 (passes), multiply by its weight and sum. ' +
          `Maximum ${rubricMaxScore()}. Report the total, then the three lowest-scoring criteria, each with the specific element at fault and a concrete fix using the direction tokens. Below 70% of the maximum, fix and re-check before presenting.`,
        '',
        ...lines,
        ...extra,
      ].join('\n');
      return ok(text, {
        criteria: RUBRIC as unknown as Record<string, unknown>[],
        max_score: rubricMaxScore(),
        ...(direction
          ? { direction_checks: { present: direction.signature_details, absent: direction.avoid } }
          : {}),
      });
    },
  );
}
