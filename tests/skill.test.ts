import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Client, InMemoryTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

const dir = join(import.meta.dirname, '..', 'skills', 'premium-ui');
const raw = readFileSync(join(dir, 'SKILL.md'), 'utf8').replace(/\r\n/g, '\n');
const fm = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(raw);
const front = Object.fromEntries(
  (fm?.[1] ?? '')
    .split('\n')
    .map((l) => /^([a-z_-]+):\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => [m[1]!, m[2]!]),
);
const body = fm?.[2] ?? '';
const description = front.description ?? '';
const whenToUse = front.when_to_use ?? '';

describe('premium-ui skill', () => {
  it('has valid frontmatter (Agent Skills spec)', () => {
    expect(fm).not.toBeNull();
    expect(front.name).toBe('premium-ui');
    expect(front.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(description.length).toBeGreaterThan(40);
    // Spec allows 1024; claude.ai uploads may cap at 200, so stay under that.
    expect(description.length).toBeLessThanOrEqual(200);
    expect((description + whenToUse).length).toBeLessThanOrEqual(1536);
    expect(description).not.toMatch(/[<>]/);
  });

  it('keeps the body short (under 500 lines)', () => {
    expect(body.split('\n').length).toBeLessThan(500);
  });

  it('links only to reference files that exist', () => {
    const links = [...body.matchAll(/\]\(([^)]+\.md)\)/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const l of links) expect(existsSync(join(dir, l)), l).toBe(true);
  });

  it('only names tools the MCP server actually provides', async () => {
    const [a, b] = InMemoryTransport.createLinkedPair();
    const server = createServer();
    const client = new Client({ name: 't', version: '1' });
    await server.connect(b);
    await client.connect(a);
    const { tools } = await client.listTools();
    await client.close();
    const names = new Set(tools.map((t) => t.name));
    const mentioned = [
      ...new Set([...raw.matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]!)),
    ].filter((n) => /^(get|list|review|check)_/.test(n));
    expect(mentioned.length).toBeGreaterThanOrEqual(8);
    for (const n of mentioned) expect(names.has(n), n).toBe(true);
  });
});
