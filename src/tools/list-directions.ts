import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { concepts, termMatches } from '../brief/vocab.js';
import { getDirections } from '../directions/index.js';
import { ok } from './result.js';

export function listDirections(tag?: string) {
  const bag = tag ? concepts(tag) : undefined;
  return getDirections()
    .filter((d) => {
      if (!tag || !bag) return true;
      if (d.id === tag) return true;
      return [...d.best_for, ...d.mood].some(
        (t) => termMatches(t, bag) || termMatches(tag, concepts(t)),
      );
    })
    .map((d) => ({
      id: d.id,
      name: d.name,
      summary: d.summary,
      best_for: d.best_for,
      mood: d.mood,
    }));
}

export function registerListDirections(server: McpServer): void {
  server.registerTool(
    'list_directions',
    {
      title: 'List design directions',
      description:
        'List the available design directions (complete, opinionated design systems) with id, summary, best_for and mood. Use it to show the user the options or to pick one by hand. To choose automatically from a product brief, call get_design_direction instead. The optional tag filters by use case or mood, for example "banking" or "playful".',
      inputSchema: z.object({
        tag: z
          .string()
          .max(80)
          .optional()
          .describe('Filter by a use case or mood word, for example "banking" or "calm"'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ tag }) => {
      const items = listDirections(tag);
      if (items.length === 0) {
        return ok(
          `No directions match "${tag}". Call list_directions without a tag to see all ${getDirections().length}.`,
          { directions: [] },
        );
      }
      const lines = items.map(
        (d) =>
          `- **${d.name}** (\`${d.id}\`): ${d.summary}\n  Best for: ${d.best_for.slice(0, 6).join(', ')}. Mood: ${d.mood.join(', ')}.`,
      );
      return ok(`${items.length} design direction(s):\n\n${lines.join('\n')}`, {
        directions: items,
      });
    },
  );
}
