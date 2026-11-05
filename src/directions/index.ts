// Loads and validates every shipped design direction.
// To add a direction: create <id>.json next to this file and add it to RAW below.
import type { Direction } from '../schema/direction.schema.js';
import fintechTrust from './fintech-trust.json' with { type: 'json' };
import { validateDirection } from './validate.js';

const RAW: readonly unknown[] = [fintechTrust];

function load(): readonly Direction[] {
  const out: Direction[] = [];
  const seen = new Set<string>();
  for (const raw of RAW) {
    const issues = validateDirection(raw);
    const id = (raw as { id?: string }).id ?? '<unknown>';
    if (issues.length > 0) {
      const list = issues.map((i) => `  - ${i.path}: ${i.message}`).join('\n');
      throw new Error(`Invalid design direction "${id}":\n${list}`);
    }
    if (seen.has(id)) throw new Error(`Duplicate design direction id "${id}"`);
    seen.add(id);
    out.push(raw as Direction);
  }
  return Object.freeze(out.sort((a, b) => a.id.localeCompare(b.id)));
}

let cache: readonly Direction[] | undefined;

/** All directions, sorted by id. Validated once, on first access. */
export function getDirections(): readonly Direction[] {
  cache ??= load();
  return cache;
}

export function getDirection(id: string): Direction | undefined {
  return getDirections().find((d) => d.id === id);
}

/** Raw (unvalidated) direction files, for CI checks that report every issue. */
export function rawDirections(): readonly unknown[] {
  return RAW;
}
