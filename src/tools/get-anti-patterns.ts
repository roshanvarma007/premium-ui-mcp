import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { antiPatternsFor } from '../data/anti-patterns.js';
import { type PlatformId, PlatformSchema } from '../platforms.js';
import { ok } from './result.js';

export function antiPatternsText(platform?: PlatformId): string {
  const lines = antiPatternsFor(platform).map((a) => {
    const tell = a.looks_like ? `\n  Looks like: \`${a.looks_like}\`` : '';
    return `- **${a.title}**: ${a.why}\n  Instead: ${a.instead}${tell}`;
  });
  const scope = platform ? ` (${platform})` : '';
  return `Never do these${scope}:\n\n${lines.join('\n')}`;
}

export function registerGetAntiPatterns(server: McpServer): void {
  server.registerTool(
    'get_anti_patterns',
    {
      title: 'Get the AI-look anti-patterns',
      description:
        'Return the "never do this" list: patterns that make UI look AI-generated or unfinished (gradients, glassmorphism, glow shadows, default palettes, emoji icons, type and spacing sprawl, poor contrast and more). Each comes with why it hurts and what to do instead. Pass the platform id for platform-specific tells. Read this before writing UI code.',
      inputSchema: z.object({
        platform: PlatformSchema.optional().describe('Platform id for platform-specific examples'),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ platform }) =>
      ok(antiPatternsText(platform), { anti_patterns: antiPatternsFor(platform) }),
  );
}
