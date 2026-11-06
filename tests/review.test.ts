import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDirection } from '../src/directions/index.js';
import { PLATFORM_IDS, type PlatformId } from '../src/platforms.js';
import { review } from '../src/review/engine.js';
import { stripComments } from '../src/review/source.js';
import type { SourceFile } from '../src/review/types.js';

const root = join(import.meta.dirname, '..');
const fixtures = join(root, 'fixtures');

function load(dir: string): SourceFile[] {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((n) => {
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  return walk(dir)
    .filter((p) => !p.endsWith('expected.json'))
    .map((p) => ({
      path: relative(dir, p).split('\\').join('/'),
      content: readFileSync(p, 'utf8'),
    }));
}

describe('review_ui fixtures', () => {
  for (const platform of PLATFORM_IDS) {
    const bad = join(fixtures, `bad-${platform}`);
    const good = join(fixtures, `good-${platform}`);

    it(`bad-${platform}: produces every expected finding`, () => {
      const expected = JSON.parse(readFileSync(join(bad, 'expected.json'), 'utf8')) as {
        platform: PlatformId;
        direction_id?: string;
        rules: string[];
      };
      const direction = expected.direction_id ? getDirection(expected.direction_id) : undefined;
      const result = review(expected.platform, load(bad), direction);
      const found = new Set(result.findings.map((f) => f.rule));
      const missing = expected.rules.filter((r) => !found.has(r));
      expect(missing).toEqual([]);
      expect(result.score).toBeLessThan(40);
    });

    it(`good-${platform}: produces no findings at all`, () => {
      expect(existsSync(good)).toBe(true);
      const result = review(platform, load(good), getDirection('fintech-trust'));
      expect(result.findings).toEqual([]);
      expect(result.score).toBe(100);
    });
  }
});

describe('review engine', () => {
  it('is deterministic', () => {
    const files = load(join(fixtures, 'bad-react'));
    expect(JSON.stringify(review('react', files))).toBe(JSON.stringify(review('react', files)));
  });

  it('caps repeated findings per rule and file, and notes the overflow', () => {
    const css = Array.from({ length: 20 }, (_, i) => `.a${i} { color: #12345${i % 10}; }`).join(
      '\n',
    );
    const result = review('html', [{ path: 'a.css', content: css }]);
    const hard = result.findings.filter((f) => f.rule === 'hardcoded-color');
    expect(hard).toHaveLength(8);
    expect(hard[7]!.message).toMatch(/12 more in this file/);
  });

  it('ignores comments and generated token files', () => {
    const result = review('html', [
      {
        path: 'a.css',
        content:
          '/* color: #6366F1; background: linear-gradient(red, blue) */\n.a { color: var(--x); }',
      },
      { path: 'tokens.css', content: ':root { --color-accent: #0F6B4F; }' },
    ]);
    expect(result.findings).toEqual([]);
  });

  it('respects a direction that permits gradients', () => {
    const d = structuredClone(getDirection('fintech-trust')!);
    d.permits = { gradients: true };
    const files = [
      { path: 'a.css', content: '.a { background-image: linear-gradient(var(--a), var(--b)); }' },
    ];
    expect(review('html', files, d).findings.map((f) => f.rule)).not.toContain('gradient-usage');
    expect(review('html', files).findings.map((f) => f.rule)).toContain('gradient-usage');
  });

  it('keeps line numbers correct after stripping comments', () => {
    const src = '/* a\n b */\n.x { color: #FF0000; }';
    expect(stripComments(src, 'css').split('\n')).toHaveLength(3);
    const result = review('html', [{ path: 'x.css', content: src }]);
    expect(result.findings[0]!.line).toBe(3);
  });
});

describe('false-positive check on real sample apps', () => {
  const samples: Array<[PlatformId, string, string[]]> = [
    ['html', 'examples/web-sample', ['css', 'js', 'index.html']],
    ['react', 'examples/react-sample', ['src', 'index.html']],
    ['nextjs', 'examples/nextjs-sample', ['app', 'pages', 'components', 'styles']],
    ['compose', 'examples/compose-sample', ['app/src']],
    ['android-xml', 'examples/android-xml-sample', ['app/src']],
  ];
  for (const [platform, dir, parts] of samples) {
    it(`${dir} has no findings`, () => {
      const files = parts.flatMap((p) => {
        const abs = join(root, dir, p);
        const list = statSync(abs).isDirectory()
          ? load(abs).map((f) => ({ ...f, path: `${p}/${f.path}` }))
          : [{ path: p, content: readFileSync(abs, 'utf8') }];
        return list.filter(
          (f) =>
            /\.(css|html|[jt]sx?|kt|xml)$/.test(f.path) &&
            !/font_certs|preloaded_fonts/.test(f.path),
        );
      });
      const result = review(platform, files, getDirection('fintech-trust'));
      expect(result.findings).toEqual([]);
    });
  }
});

describe('false-positive check on realistic snippets (fixtures/realistic)', () => {
  for (const platform of PLATFORM_IDS) {
    it(`${platform}: 5+ realistic snippets produce no errors or warnings`, () => {
      const files = load(join(fixtures, 'realistic', platform));
      expect(files.length).toBeGreaterThanOrEqual(5);
      const result = review(platform, files, getDirection('fintech-trust'));
      const strong = result.findings.filter((f) => f.severity !== 'info');
      expect(strong).toEqual([]);
    });
  }
});

describe('rule documentation', () => {
  it('documents every rule id the engine can emit', () => {
    const doc = readFileSync(join(root, 'docs', 'review-rules.md'), 'utf8');
    const sources = ['common.ts', 'platform.ts']
      .map((n) => readFileSync(join(root, 'src', 'review', 'rules', n), 'utf8'))
      .join('\n');
    const ids = new Set<string>();
    for (const m of sources.matchAll(
      /(?:id:|f\(|finding\(|simple\(|rule\()\s*'([a-z]+(?:-[a-z]+)*)'/g,
    ))
      ids.add(m[1]!);
    for (const m of sources.matchAll(/f\(\s*\n?\s*'([a-z]+(?:-[a-z]+)*)'/g)) ids.add(m[1]!);
    // Group rules that only emit other ids.
    for (const group of ['html-document-basics', 'nextjs', 'compose', 'android-xml'])
      ids.delete(group);
    expect(ids.size).toBeGreaterThan(30);
    const undocumented = [...ids].filter((id) => !doc.includes(`\`${id}\``));
    expect(undocumented).toEqual([]);
  });
});
