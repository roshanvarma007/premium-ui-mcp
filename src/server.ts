import { McpServer, ResourceTemplate } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { getDirection, getDirections } from './directions/index.js';
import { PlatformSchema } from './platforms.js';
import { registerCheckContrast } from './tools/check-contrast.js';
import { antiPatternsText, registerGetAntiPatterns } from './tools/get-anti-patterns.js';
import { registerGetDesignDirection } from './tools/get-design-direction.js';
import { registerGetThemeCode } from './tools/get-theme-code.js';
import { registerListDirections } from './tools/list-directions.js';
import { registerReviewUi } from './tools/review-ui.js';
import { SERVER_NAME, SERVER_VERSION } from './version.js';

/**
 * Builds a fully configured MCP server instance.
 * Called once per connection by the stdio entry point, and directly by tests.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerGetDesignDirection(server);
  registerGetThemeCode(server);
  registerListDirections(server);
  registerCheckContrast(server);
  registerGetAntiPatterns(server);
  registerReviewUi(server);

  registerResources(server);
  registerPrompts(server);
  return server;
}

function registerResources(server: McpServer): void {
  server.registerResource(
    'direction',
    new ResourceTemplate('direction://{id}', {
      list: async () => ({
        resources: getDirections().map((d) => ({
          uri: `direction://${d.id}`,
          name: d.id,
          title: d.name,
          description: d.summary,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Design direction',
      description: 'A complete design direction as JSON',
      mimeType: 'application/json',
    },
    async (uri, { id }) => {
      const direction = getDirection(String(id));
      if (!direction) throw new Error(`Unknown direction "${id}"`);
      return {
        contents: [
          { uri: uri.href, mimeType: 'application/json', text: JSON.stringify(direction, null, 2) },
        ],
      };
    },
  );

  server.registerResource(
    'anti-patterns',
    'rules://anti-patterns',
    {
      title: 'AI-look anti-patterns',
      description: 'Patterns that make UI look AI-generated, with what to do instead',
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: antiPatternsText() }],
    }),
  );
}

function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'design_kickoff',
    {
      title: 'Design kickoff',
      description:
        'Gather a design brief (product, audience, feeling, platform) and pick a design direction before writing UI code.',
      argsSchema: z.object({
        idea: z.string().optional().describe('What you want to build, in your own words'),
        platform: PlatformSchema.optional().describe('Target platform, if already known'),
      }),
    },
    ({ idea, platform }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'We are about to design a UI. Before writing any code:',
              '1. Make sure you know four things: what is being built, who it is for, what it should feel like (2 or 3 words), and the platform. Ask me only for what is missing, in at most four short questions.',
              '2. If the platform is unknown, detect it from the project (package.json with next or react, plain HTML files, build.gradle with Compose, or res/layout XML).',
              '3. Call get_design_direction with the brief. If it returns needs_clarification, ask me those questions.',
              '4. Show me the chosen direction in two or three sentences and the alternates, then call get_theme_code and write the theme files before any screen code.',
              idea ? `\nMy idea: ${idea}` : '',
              platform ? `Platform: ${platform}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          },
        },
      ],
    }),
  );
}
