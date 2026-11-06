import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getDirection, getDirections } from '../directions/index.js';
import { PlatformSchema } from '../platforms.js';
import { review } from '../review/engine.js';
import { fail, ok } from './result.js';

const MAX_FILES = 60;
const MAX_BYTES = 400_000;

export const ReviewUiInput = z.object({
  platform: PlatformSchema.describe('Platform id of the code being reviewed'),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(400).describe('Project-relative path, e.g. src/App.tsx'),
        content: z.string().max(MAX_BYTES).describe('Full file content'),
      }),
    )
    .min(1)
    .max(MAX_FILES)
    .describe('UI source files to review (screens, components, stylesheets, layouts)'),
  direction_id: z
    .string()
    .max(64)
    .optional()
    .describe('Direction the UI should follow; enables palette, spacing-scale and font checks'),
});

export function registerReviewUi(server: McpServer): void {
  server.registerTool(
    'review_ui',
    {
      title: 'Review UI code for AI-look and quality problems',
      description:
        'Statically review UI source files (CSS, HTML, JS/TS/JSX/TSX, Kotlin Compose, Android XML) against machine-checkable rules: contrast, hardcoded colors, gradients, glassmorphism, glow shadows, default AI palettes, font-size / radius / spacing sprawl, emoji icons, touch targets, focus styles, alt text, theme flash and platform-specific checks. Call it after writing or changing UI code and fix every error and warn finding before presenting the result. Include the generated theme files so token references resolve. Fully offline.',
      inputSchema: ReviewUiInput,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ platform, files, direction_id }) => {
      const direction = direction_id ? getDirection(direction_id) : undefined;
      if (direction_id && !direction) {
        return fail(
          `Unknown direction "${direction_id}". Available: ${getDirections()
            .map((d) => d.id)
            .join(', ')}.`,
        );
      }
      const total = files.reduce((n, f) => n + f.content.length, 0);
      if (total > MAX_BYTES * 4) {
        return fail(
          'Too much code in one call. Review the changed screens and their stylesheets in smaller batches.',
        );
      }
      const result = review(platform, files, direction);
      const lines = result.findings.map(
        (x) => `- [${x.severity}] ${x.rule} at ${x.file}:${x.line}: ${x.message}\n  Fix: ${x.fix}`,
      );
      const text = [result.summary, ...(lines.length ? ['', ...lines] : [])].join('\n');
      return ok(text, {
        score: result.score,
        findings: result.findings,
        summary: result.summary,
      });
    },
  );
}
