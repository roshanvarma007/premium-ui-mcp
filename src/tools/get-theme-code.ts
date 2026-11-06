import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { generateTheme, supportedPlatforms, UnsupportedPlatformError } from '../adapters/index.js';
import { DEFAULT_OPTIONS } from '../adapters/types.js';
import { getDirection, getDirections } from '../directions/index.js';
import { type PlatformId, PlatformSchema } from '../platforms.js';
import { fail, ok } from './result.js';

export const GetThemeCodeInput = z.object({
  direction_id: z.string().min(1).max(64).describe('Direction id from get_design_direction'),
  platform: z
    .union([PlatformSchema, z.array(PlatformSchema).min(1).max(3)])
    .describe(
      'Platform id, or several that are used together, for example ["nextjs", "tailwind"] or ["html", "tailwind"]',
    ),
  mode: z
    .enum(['light', 'dark', 'both'])
    .optional()
    .describe('Theme modes to generate (default both)'),
  language: z.enum(['ts', 'js']).optional().describe('react / nextjs only (default ts)'),
  router: z.enum(['app', 'pages']).optional().describe('nextjs only (default app)'),
  package_name: z
    .string()
    .regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, 'Use a Java package name like com.example.app')
    .optional()
    .describe('Android application package (compose / android-xml). Default com.example.app'),
  font_source: z
    .enum(['self-hosted', 'google-fonts'])
    .optional()
    .describe(
      'self-hosted (default, private and fast): fonts are bundled with the app or served by the site. google-fonts: opt-in runtime loading from Google.',
    ),
});

export type GetThemeCodeArgs = z.infer<typeof GetThemeCodeInput>;

export function getThemeCode(args: GetThemeCodeArgs) {
  const direction = getDirection(args.direction_id);
  if (!direction) {
    return {
      error: `Unknown direction "${args.direction_id}". Available: ${getDirections()
        .map((d) => d.id)
        .join(', ')}.`,
    };
  }
  const platforms: PlatformId[] = Array.isArray(args.platform) ? args.platform : [args.platform];
  try {
    const out = generateTheme(direction, platforms, {
      ...DEFAULT_OPTIONS,
      mode: args.mode ?? DEFAULT_OPTIONS.mode,
      language: args.language ?? DEFAULT_OPTIONS.language,
      router: args.router ?? DEFAULT_OPTIONS.router,
      packageName: args.package_name ?? DEFAULT_OPTIONS.packageName,
      fontSource: args.font_source ?? DEFAULT_OPTIONS.fontSource,
    });
    return { direction, platforms, ...out };
  } catch (e) {
    if (e instanceof UnsupportedPlatformError) return { error: e.message };
    throw e;
  }
}

export function registerGetThemeCode(server: McpServer): void {
  server.registerTool(
    'get_theme_code',
    {
      title: 'Generate theme code for a platform',
      description:
        'Generate ready-to-write theme files (colors, typography, spacing, radii, elevation, motion, light and dark) for a design direction on a platform: html, tailwind, react, nextjs, compose or android-xml. Call it right after get_design_direction and write every returned file into the project BEFORE writing any screen code. Then follow next_steps. Screens must use only these tokens.',
      inputSchema: GetThemeCodeInput,
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const r = getThemeCode(args);
      if ('error' in r)
        return fail(`${r.error} Supported platforms: ${supportedPlatforms().join(', ')}.`);
      const body = r.files
        .map((f) => `### ${f.path}\n\`\`\`${fence(f.path)}\n${f.content.trimEnd()}\n\`\`\``)
        .join('\n\n');
      const text = [
        `Theme for "${r.direction.name}" on ${r.platforms.join(' + ')}: ${r.files.length} file(s). Write each file at its path (adjust the root folder if the project layout differs).`,
        '',
        body,
        '',
        'Next steps:',
        ...r.next_steps.map((s, i) => `${i + 1}. ${s}`),
      ].join('\n');
      return ok(text, { files: r.files, next_steps: r.next_steps });
    },
  );
}

function fence(path: string): string {
  const ext = path.slice(path.lastIndexOf('.') + 1);
  const map: Record<string, string> = {
    kt: 'kotlin',
    ts: 'ts',
    tsx: 'tsx',
    js: 'js',
    jsx: 'jsx',
    mjs: 'js',
    css: 'css',
    html: 'html',
    xml: 'xml',
    json: 'json',
  };
  return map[ext] ?? '';
}
