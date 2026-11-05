import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SERVER_NAME, SERVER_VERSION } from '../src/version.js';

const root = join(import.meta.dirname, '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('repository invariants', () => {
  it('version constant matches package.json', () => {
    expect(SERVER_NAME).toBe(pkg.name);
    expect(SERVER_VERSION).toBe(pkg.version);
  });

  it('package.json has the fields npx distribution needs', () => {
    expect(pkg.type).toBe('module');
    expect(pkg.bin['premium-ui-mcp']).toBe('dist/index.js');
    expect(pkg.engines.node).toBe('>=22');
    expect(pkg.license).toBe('MIT');
  });

  it('src/ never imports network libraries or calls fetch (no network at runtime)', () => {
    const banned = [
      /from\s+['"](node:)?(http|https|http2|net|tls|dgram|dns)['"]/,
      /from\s+['"](undici|axios|node-fetch|got|ky|ws)['"]/,
      /\bfetch\s*\(/,
      /\bnew\s+WebSocket\b/,
      /\bXMLHttpRequest\b/,
    ];
    const offenders: string[] = [];
    for (const file of walk(join(root, 'src')).filter((f) => f.endsWith('.ts'))) {
      const text = readFileSync(file, 'utf8');
      for (const re of banned) {
        if (re.test(text)) offenders.push(`${file}: ${re}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('src/ never writes to stdout directly (stdout is the protocol channel)', () => {
    const offenders = walk(join(root, 'src'))
      .filter((f) => f.endsWith('.ts'))
      .filter((f) => /console\.(log|info)\(|process\.stdout\.write/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
