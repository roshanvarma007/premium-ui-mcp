import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getDirection, getDirections, rawDirections } from '../src/directions/index.js';
import { contrastReport, validateDirection } from '../src/directions/validate.js';
import { directionJsonSchema } from '../src/schema/direction.schema.js';

const root = join(import.meta.dirname, '..');

// biome-ignore lint/suspicious/noExplicitAny: tests mutate cloned fixtures into invalid shapes on purpose.
type Loose = Record<string, any>;
const fintech = (): Loose => structuredClone(getDirection('fintech-trust')!) as Loose;

describe('shipped directions (CI quality gate)', () => {
  it('loads at least one direction', () => {
    expect(getDirections().length).toBeGreaterThanOrEqual(1);
  });

  for (const raw of rawDirections()) {
    const id = (raw as { id: string }).id;
    it(`${id}: passes schema, contrast and consistency checks`, () => {
      expect(validateDirection(raw)).toEqual([]);
    });
    it(`${id}: every required text/background pair passes WCAG AA`, () => {
      const failing = contrastReport(getDirection(id)!).filter((c) => !c.pass);
      expect(failing).toEqual([]);
    });
    it(`${id}: every font has an open license, source and fallback`, () => {
      const t = getDirection(id)!.typography;
      for (const f of [t.display_family, t.body_family, t.mono_family]) {
        if (!f) continue;
        expect(f.license).toMatch(/^(OFL-1\.1|Apache-2\.0|UFL-1\.0|MIT)$/);
        expect(f.source).toBeTruthy();
        expect(f.fallback.length).toBeGreaterThan(0);
      }
    });
    it(`${id}: file name matches id`, () => {
      expect(() =>
        readFileSync(join(root, 'src', 'directions', `${id}.json`), 'utf8'),
      ).not.toThrow();
    });
  }
});

describe('validateDirection rejects bad directions', () => {
  it('flags a failing contrast pair with a precise message', () => {
    const d = fintech();
    d.color.light.text_muted = '#B0B0B0';
    const issues = validateDirection(d);
    expect(issues.map((i) => i.path)).toContain('color.light.text_muted');
    expect(issues[0]!.message).toMatch(/needs 4.5:1/);
  });
  it('fails when a font license is missing', () => {
    const d = fintech();
    delete d.typography.body_family.license;
    expect(validateDirection(d).some((i) => i.path === 'typography.body_family.license')).toBe(
      true,
    );
  });
  it('fails on a proprietary license value', () => {
    const d = fintech();
    d.typography.body_family.license = 'Proprietary';
    expect(validateDirection(d).length).toBeGreaterThan(0);
  });
  it('fails when dark is a copy of light', () => {
    const d = fintech();
    d.color.dark = { ...d.color.light };
    expect(validateDirection(d).some((i) => i.path === 'color.dark')).toBe(true);
  });
  it('fails on off-grid spacing', () => {
    const d = fintech();
    d.spacing.scale = [0, 4, 8, 10, 16, 24];
    expect(validateDirection(d).some((i) => i.message.includes('not a multiple'))).toBe(true);
  });
  it('fails when a scale weight is not declared on the family', () => {
    const d = fintech();
    d.typography.scale.title.weight = 800;
    expect(validateDirection(d).some((i) => i.path === 'typography.scale.title.weight')).toBe(true);
  });
  it('fails on lowercase hex and unknown keys', () => {
    const d = fintech();
    d.color.light.bg = '#f7f6f3';
    d.extra = true;
    expect(validateDirection(d).length).toBeGreaterThanOrEqual(2);
  });
  it('requires link to pass 4.5:1 when present, and relaxes accent to 3:1', () => {
    const d = fintech();
    d.color.light.accent = '#3E9A78';
    expect(validateDirection(d).some((i) => i.path === 'color.light.accent')).toBe(true);
    d.color.light.link = '#0F6B4F';
    const paths = validateDirection(d).map((i) => i.path);
    expect(paths).not.toContain('color.light.accent');
    expect(paths).not.toContain('color.light.link');
  });
});

describe('generated JSON Schema', () => {
  it('is committed and up to date (run npm run gen:schema)', () => {
    const file = join(root, 'src', 'schema', 'direction.schema.json');
    const committed = JSON.parse(readFileSync(file, 'utf8'));
    expect(committed).toEqual(directionJsonSchema());
  });
});
