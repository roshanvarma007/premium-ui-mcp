// End-to-end: spawn the built server over stdio, exactly as an MCP client would.
// Requires `npm run build` first (CI builds before testing). Skipped locally if dist/ is missing.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';

const entry = join(import.meta.dirname, '..', 'dist', 'index.js');
const built = existsSync(entry);
if (!built && process.env.CI)
  throw new Error('dist/index.js missing: run npm run build before tests in CI');

describe.skipIf(!built)('stdio server (dist)', () => {
  it('starts, answers a tool call, and closes cleanly', async () => {
    const client = new Client({ name: 'stdio-test', version: '1.0.0' });
    await client.connect(new StdioClientTransport({ command: process.execPath, args: [entry] }));
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThanOrEqual(4);
    const r = (await client.callTool({
      name: 'check_contrast',
      arguments: { foreground: '#16181D', background: '#F7F6F3' },
    })) as { structuredContent?: { passes_aa?: boolean } };
    expect(r.structuredContent?.passes_aa).toBe(true);
    await client.close();
  }, 20_000);

  it('writes nothing but JSON-RPC to stdout', async () => {
    const child = spawn(process.execPath, [entry], { stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    const init = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'raw', version: '1.0.0' },
      },
    };
    child.stdin.write(`${JSON.stringify(init)}\n`);
    await new Promise((r) => setTimeout(r, 1500));
    child.stdin.end();
    await new Promise((r) => child.on('close', r));
    const lines = out.split('\n').filter((l) => l.trim().length > 0);
    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(JSON.parse(line).jsonrpc).toBe('2.0');
    }
  }, 20_000);
});
