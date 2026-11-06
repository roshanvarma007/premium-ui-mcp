import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

let client: Client;

beforeAll(async () => {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer();
  client = new Client({ name: 'test-harness', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
});

type TextResult = {
  content: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

async function call(name: string, args: Record<string, unknown>): Promise<TextResult> {
  return (await client.callTool({ name, arguments: args })) as TextResult;
}
const text = (r: TextResult) => r.content.map((c) => c.text ?? '').join('\n');

describe('MCP server', () => {
  it('lists the read-only tools with descriptions', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      expect.arrayContaining([
        'check_contrast',
        'get_anti_patterns',
        'get_design_direction',
        'list_directions',
      ]),
    );
    for (const t of tools) {
      expect(t.description!.length).toBeGreaterThan(80);
      expect(t.annotations?.readOnlyHint).toBe(true);
    }
  });

  it('get_design_direction returns a full direction for a clear brief', async () => {
    const r = await call('get_design_direction', {
      product_type: 'personal budgeting app',
      audience: 'young professionals',
      feelings: ['calm', 'trustworthy'],
      platform: 'compose',
    });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent?.status).toBe('ok');
    expect(r.structuredContent?.direction_id).toBe('fintech-trust');
    expect(text(r)).toMatch(/Recommended direction: Fintech Trust/);
    expect(text(r)).toMatch(/"accent": "#0F6B4F"/);
    expect(text(r)).toMatch(/get_theme_code/);
  });

  it('get_design_direction asks clarifying questions for a vague brief', async () => {
    const r = await call('get_design_direction', { product_type: 'an app', platform: 'html' });
    expect(r.structuredContent?.status).toBe('needs_clarification');
    expect((r.structuredContent?.questions as string[] | undefined)?.length).toBeLessThanOrEqual(4);
  });

  it('get_design_direction validates the platform id', async () => {
    const r = await call('get_design_direction', { product_type: 'bank', platform: 'flutter' });
    expect(r.isError).toBe(true);
  });

  it('list_directions lists and filters', async () => {
    const all = await call('list_directions', {});
    expect(
      (all.structuredContent?.directions as unknown[] | undefined)?.length,
    ).toBeGreaterThanOrEqual(1);
    const banking = await call('list_directions', { tag: 'banking' });
    expect(text(banking)).toMatch(/fintech-trust/);
    const none = await call('list_directions', { tag: 'zzzz' });
    expect(text(none)).toMatch(/No directions match/);
  });

  it('check_contrast reports ratios and suggests a fix', async () => {
    const r = await call('check_contrast', { foreground: '#999999', background: '#FFFFFF' });
    expect(r.structuredContent?.ratio).toBe(2.84);
    expect(r.structuredContent?.passes_aa).toBe(false);
    expect(r.structuredContent?.suggestion_aa).toMatch(/^#[0-9A-F]{6}$/);
    const large = await call('check_contrast', {
      foreground: '#767676',
      background: '#FFFFFF',
      text_size_px: 24,
    });
    expect(large.structuredContent?.large_text).toBe(true);
    expect(large.structuredContent?.passes_aa).toBe(true);
  });

  it('check_contrast rejects invalid colors with a helpful message', async () => {
    const r = await call('check_contrast', { foreground: 'blue', background: '#FFF' });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/Use hex/);
  });

  it('get_anti_patterns returns platform tells', async () => {
    const r = await call('get_anti_patterns', { platform: 'tailwind' });
    expect(text(r)).toMatch(/bg-gradient-to-r/);
    expect(text(r)).toMatch(/Emoji as icons/);
  });

  it('exposes directions and anti-patterns as resources', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('direction://fintech-trust');
    expect(uris).toContain('rules://anti-patterns');
    const read = await client.readResource({ uri: 'direction://fintech-trust' });
    const first = read.contents[0] as { text: string };
    expect(JSON.parse(first.text).id).toBe('fintech-trust');
  });

  it('exposes the design_kickoff prompt', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name)).toContain('design_kickoff');
    const p = await client.getPrompt({ name: 'design_kickoff', arguments: { idea: 'a bank' } });
    const msg = p.messages[0]!.content as { text: string };
    expect(msg.text).toMatch(/get_design_direction/);
    expect(msg.text).toMatch(/My idea: a bank/);
  });
});

describe('get_theme_code', () => {
  it('returns compose files and next steps', async () => {
    const r = await call('get_theme_code', { direction_id: 'fintech-trust', platform: 'compose' });
    expect(r.isError).toBeFalsy();
    const files = r.structuredContent?.files as Array<{ path: string }>;
    expect(files.map((f) => f.path)).toContain(
      'app/src/main/java/com/example/app/ui/theme/Theme.kt',
    );
    expect(text(r)).toMatch(/Next steps:/);
  });
  it('rejects an unknown direction with the list of valid ids', async () => {
    const r = await call('get_theme_code', { direction_id: 'nope', platform: 'compose' });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/fintech-trust/);
  });
  it('rejects an invalid package name', async () => {
    const r = await call('get_theme_code', {
      direction_id: 'fintech-trust',
      platform: 'compose',
      package_name: 'Not A Package',
    });
    expect(r.isError).toBe(true);
  });
});

describe('review_ui', () => {
  it('scores code and returns findings with fixes', async () => {
    const r = await call('review_ui', {
      platform: 'html',
      files: [
        { path: 'a.css', content: '.hero { background: linear-gradient(#6366F1, #A855F7); }' },
      ],
    });
    expect(r.isError).toBeFalsy();
    const findings = r.structuredContent?.findings as Array<{ rule: string; fix: string }>;
    expect(findings.map((f) => f.rule)).toContain('gradient-usage');
    expect(findings.every((f) => f.fix.length > 10)).toBe(true);
    expect(r.structuredContent?.score).toBeLessThan(100);
    expect(text(r)).toMatch(/Fix:/);
  });
  it('returns a perfect score for clean code', async () => {
    const r = await call('review_ui', {
      platform: 'html',
      direction_id: 'fintech-trust',
      files: [
        {
          path: 'a.css',
          content: '.card { padding: var(--spacing-4); color: var(--color-text); }',
        },
      ],
    });
    expect(r.structuredContent?.score).toBe(100);
  });
  it('rejects an unknown direction', async () => {
    const r = await call('review_ui', {
      platform: 'html',
      direction_id: 'nope',
      files: [{ path: 'a.css', content: '' }],
    });
    expect(r.isError).toBe(true);
  });
});

describe('get_layout_blueprint and get_review_rubric', () => {
  it('returns an ordered blueprint merged with direction rules', async () => {
    const r = await call('get_layout_blueprint', {
      surface: 'landing-page',
      direction_id: 'fintech-trust',
    });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toMatch(/1\. \*\*Navigation\*\*/);
    expect(text(r)).toMatch(/Fintech Trust specifics/);
  });
  it('rejects unknown surfaces with the valid list', async () => {
    const r = await call('get_layout_blueprint', {
      surface: 'spaceship',
      direction_id: 'fintech-trust',
    });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/landing, app, game, dashboard, ecommerce/);
  });
  it('returns the rubric, with direction checks when asked', async () => {
    const r = await call('get_review_rubric', { direction_id: 'fintech-trust' });
    expect(text(r)).toMatch(/Score each criterion 0/);
    expect(text(r)).toMatch(/Absent: gradients/);
    expect(r.structuredContent?.max_score).toBeGreaterThan(20);
  });
});
