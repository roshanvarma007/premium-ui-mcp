// Runs the rule set over supplied files. Pure: no file system, no network.
import { ANDROID_PLATFORMS, type PlatformId } from '../platforms.js';
import type { Direction } from '../schema/direction.schema.js';
import { COMMON_RULES } from './rules/common.js';
import { PLATFORM_RULES } from './rules/platform.js';
import { scanKotlin, scanXml } from './scan/android.js';
import { scanWeb } from './scan/web.js';
import {
  emptyFacts,
  type Finding,
  type ReviewContext,
  type Severity,
  type SourceFile,
} from './types.js';

export const ALL_RULES = [...COMMON_RULES, ...PLATFORM_RULES];

/** Max findings per rule per file; the last kept one notes how many were omitted. */
const PER_FILE_CAP = 8;
const WEIGHT: Record<Severity, number> = { error: 12, warn: 4, info: 1 };
/** Max points one rule can cost, so a single noisy rule cannot zero the score. */
const RULE_CAP: Record<Severity, number> = { error: 36, warn: 16, info: 4 };
const ORDER: Record<Severity, number> = { error: 0, warn: 1, info: 2 };

/** Info rules that add nothing when one of these stronger rules fires on the same line. */
const SUBSUMED_BY: Record<string, string[]> = {
  'compose-literal-padding': ['off-grid-spacing'],
  'compose-literal-radius': ['radius-sprawl', 'uniform-pill-everything'],
  'xml-literal-text-size': ['xml-text-size-unit', 'tiny-text', 'font-size-sprawl'],
  'px-font-size': ['tiny-text', 'font-size-sprawl'],
};

export interface ReviewResult {
  score: number;
  findings: Finding[];
  summary: string;
  counts: Record<Severity, number>;
}

export function review(
  platform: PlatformId,
  files: SourceFile[],
  direction?: Direction,
): ReviewResult {
  // Minified build output (for example Tailwind's output.css) is not source code.
  const isMinified = (c: string) => c.length > 2000 && c.split('\n').length <= 3;
  const normalized = files
    .filter((x) => !isMinified(x.content))
    .map((x) => ({
      path: x.path.replace(/\\/g, '/'),
      content: x.content.replace(/\r\n/g, '\n'),
    }));
  const facts = emptyFacts();
  if (ANDROID_PLATFORMS.includes(platform)) {
    scanKotlin(normalized, facts);
    scanXml(normalized, facts);
  } else {
    scanWeb(normalized, direction, facts);
  }
  const ctx: ReviewContext = { platform, files: normalized, direction, facts };

  let raw: Finding[] = [];
  for (const r of ALL_RULES) {
    if (r.platforms !== 'all' && !r.platforms.includes(platform)) continue;
    raw.push(...r.check(ctx));
  }

  // Drop exact duplicates, and info findings that a stronger finding on the same line already
  // covers (for example a literal padding that is also off-grid).
  const seen = new Set<string>();
  raw = raw.filter((x) => {
    const key = `${x.rule}|${x.file}|${x.line}|${x.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const strongAt = new Map<string, Set<string>>();
  for (const x of raw) {
    if (x.severity === 'info') continue;
    const key = `${x.file}|${x.line}`;
    strongAt.set(key, (strongAt.get(key) ?? new Set()).add(x.rule));
  }
  raw = raw.filter((x) => {
    const coveredBy = SUBSUMED_BY[x.rule];
    if (x.severity !== 'info' || !coveredBy) return true;
    const strong = strongAt.get(`${x.file}|${x.line}`);
    return !strong || !coveredBy.some((r) => strong.has(r));
  });

  raw.sort(
    (a, b) =>
      ORDER[a.severity] - ORDER[b.severity] ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.rule.localeCompare(b.rule),
  );

  // Cap repeats per rule and file.
  const groups = new Map<string, Finding[]>();
  for (const x of raw) {
    const key = `${x.rule}|${x.file}`;
    groups.set(key, [...(groups.get(key) ?? []), x]);
  }
  const findings: Finding[] = [];
  for (const x of raw) {
    const group = groups.get(`${x.rule}|${x.file}`)!;
    const index = group.indexOf(x);
    if (index >= PER_FILE_CAP) continue;
    if (index === PER_FILE_CAP - 1 && group.length > PER_FILE_CAP) {
      findings.push({
        ...x,
        message: `${x.message} (${group.length - PER_FILE_CAP} more in this file)`,
      });
    } else findings.push(x);
  }

  const counts: Record<Severity, number> = { error: 0, warn: 0, info: 0 };
  const costByRule = new Map<string, number>();
  for (const x of raw) {
    counts[x.severity]++;
    const cost = Math.min(RULE_CAP[x.severity], (costByRule.get(x.rule) ?? 0) + WEIGHT[x.severity]);
    costByRule.set(x.rule, cost);
  }
  const penalty = [...costByRule.values()].reduce((a, b) => a + b, 0);
  const score = Math.max(0, 100 - penalty);

  const ruleCounts = new Map<string, number>();
  for (const x of raw) ruleCounts.set(x.rule, (ruleCounts.get(x.rule) ?? 0) + 1);
  const top = [...ruleCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([r, n]) => `${r} (${n})`);
  const summary =
    raw.length === 0
      ? `Score ${score}/100. No findings in ${normalized.length} file(s).`
      : `Score ${score}/100. ${counts.error} error(s), ${counts.warn} warning(s), ${counts.info} info in ${normalized.length} file(s). Most frequent: ${top.join(', ')}. Fix every error and warning, then review again.`;
  return { score, findings, summary, counts };
}
