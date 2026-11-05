import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { parseHex, toHex } from '../a11y/color.js';
import {
  AA_LARGE,
  AA_NORMAL,
  AAA_LARGE,
  AAA_NORMAL,
  contrastHex,
  floorRatio,
  isLargeText,
  nearestPassingForeground,
} from '../a11y/contrast.js';
import { fail, ok } from './result.js';

export const CheckContrastInput = z.object({
  foreground: z.string().max(16).describe('Text or icon color as hex: #RGB or #RRGGBB'),
  background: z.string().max(16).describe('Background color as hex: #RGB or #RRGGBB'),
  text_size_px: z
    .number()
    .min(1)
    .max(400)
    .optional()
    .describe('Text size in px (or sp). Omit for normal body text.'),
  bold: z.boolean().optional().describe('True if the text is bold (600 or heavier)'),
});

export function checkContrast(input: z.infer<typeof CheckContrastInput>) {
  const fg = parseHex(input.foreground);
  const bg = parseHex(input.background);
  if (!fg || !bg) return null;
  const foreground = toHex(fg);
  const background = toHex(bg);
  const ratio = floorRatio(contrastHex(foreground, background));
  const large =
    input.text_size_px !== undefined && isLargeText(input.text_size_px, input.bold ?? false);
  const aaTarget = large ? AA_LARGE : AA_NORMAL;
  const aaaTarget = large ? AAA_LARGE : AAA_NORMAL;
  const passesAA = ratio >= aaTarget;
  const passesAAA = ratio >= aaaTarget;
  return {
    foreground,
    background,
    ratio,
    large_text: large,
    aa: { normal: ratio >= AA_NORMAL, large: ratio >= AA_LARGE, ui_component: ratio >= AA_LARGE },
    aaa: { normal: ratio >= AAA_NORMAL, large: ratio >= AAA_LARGE },
    passes_aa: passesAA,
    passes_aaa: passesAAA,
    suggestion_aa: passesAA ? null : nearestPassingForeground(foreground, background, aaTarget),
    suggestion_aaa: passesAAA ? null : nearestPassingForeground(foreground, background, aaaTarget),
  };
}

export function registerCheckContrast(server: McpServer): void {
  server.registerTool(
    'check_contrast',
    {
      title: 'Check WCAG contrast',
      description:
        'Compute the WCAG 2.x contrast ratio of a foreground and background hex color. Reports AA/AAA pass flags for normal text, large text and UI components, and suggests the nearest passing foreground color (same hue) when it fails. Use it whenever you introduce or change a text/background color pair.',
      inputSchema: CheckContrastInput,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (input) => {
      const r = checkContrast(input);
      if (!r) {
        return fail(
          `Invalid color. Use hex like #16181D or #FFF (got foreground "${input.foreground}", background "${input.background}").`,
        );
      }
      const kind = r.large_text ? 'large text' : 'normal text';
      const lines = [
        `${r.foreground} on ${r.background}: ${r.ratio}:1`,
        `For ${kind}: AA ${r.passes_aa ? 'pass' : 'FAIL'}, AAA ${r.passes_aaa ? 'pass' : 'fail'}.`,
        `AA normal text ${r.aa.normal ? 'pass' : 'fail'} (4.5:1). AA large text and UI components ${r.aa.large ? 'pass' : 'fail'} (3:1).`,
      ];
      if (r.suggestion_aa) lines.push(`Nearest AA-passing foreground: ${r.suggestion_aa}`);
      else if (!r.passes_aa) {
        lines.push(
          'No foreground with this hue reaches AA on this background; change the background.',
        );
      }
      if (r.passes_aa && r.suggestion_aaa) {
        lines.push(`Nearest AAA-passing foreground: ${r.suggestion_aaa}`);
      }
      return ok(lines.join('\n'), r);
    },
  );
}
