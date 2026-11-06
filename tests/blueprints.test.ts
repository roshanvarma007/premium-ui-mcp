import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  getBlueprint,
  getBlueprints,
  rawBlueprints,
  resolveSurface,
} from '../src/blueprints/index.js';
import { RUBRIC, rubricMaxScore } from '../src/data/rubric.js';
import { getDirection } from '../src/directions/index.js';
import { BLUEPRINT_SURFACES, BlueprintSchema } from '../src/schema/blueprint.schema.js';
import { blueprintText } from '../src/tools/blueprint-rubric.js';

const root = join(import.meta.dirname, '..');

describe('blueprints', () => {
  it('every blueprint file passes the schema', () => {
    for (const raw of rawBlueprints()) {
      const r = BlueprintSchema.safeParse(raw);
      expect(r.success, JSON.stringify(r.error?.issues)).toBe(true);
    }
  });

  it('covers every surface exactly once', () => {
    expect(
      getBlueprints()
        .map((b) => b.surface)
        .sort(),
    ).toEqual([...BLUEPRINT_SURFACES].sort());
  });

  it('landing page follows the SPEC order', () => {
    expect(getBlueprint('landing')!.sections.map((s) => s.id)).toEqual([
      'nav',
      'hero',
      'social-proof',
      'features',
      'how-it-works',
      'pricing',
      'faq',
      'final-cta',
      'footer',
    ]);
    const hero = getBlueprint('landing')!.sections.find((s) => s.id === 'hero')!;
    expect(hero.copy?.headline_max_words).toBe(8);
  });

  it('mobile app requires 48dp targets and lists empty/loading/error/offline/success states', () => {
    const app = getBlueprint('app')!;
    expect(app.principles.join(' ')).toMatch(/48dp/);
    const states = app.states.map((s) => s.name);
    for (const s of ['Empty', 'Loading', 'Error', 'Offline', 'Success'])
      expect(states).toContain(s);
  });

  it('game UI covers HUD placement, button sizes, readability and rewards', () => {
    const ids = getBlueprint('game')!.sections.map((s) => s.id);
    expect(ids).toEqual(expect.arrayContaining(['hud', 'controls', 'readability', 'feedback']));
  });

  it('resolves surface aliases', () => {
    expect(resolveSurface('Landing Page')).toBe('landing');
    expect(resolveSurface('mobile-app')).toBe('app');
    expect(resolveSurface('store')).toBe('ecommerce');
    expect(resolveSurface('game_ui')).toBe('game');
    expect(resolveSurface('spaceship')).toBeUndefined();
  });

  it('merges direction component rules into the text output', () => {
    const text = blueprintText(getBlueprint('dashboard')!, getDirection('fintech-trust')!);
    expect(text).toMatch(/styled with Fintech Trust/);
    expect(text).toMatch(/Tabular numerals for all money values/);
    expect(text).toMatch(/## States to design/);
  });

  it('generated JSON Schema is committed and up to date (npm run gen:schema)', () => {
    const committed = JSON.parse(
      readFileSync(join(root, 'src', 'schema', 'blueprint.schema.json'), 'utf8'),
    );
    expect(committed).toEqual(
      z.toJSONSchema(BlueprintSchema, { target: 'draft-2020-12', io: 'input' }),
    );
  });
});

describe('review rubric', () => {
  it('has unique criteria with pass and fail signals', () => {
    const ids = RUBRIC.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of RUBRIC) {
      expect(c.pass.length).toBeGreaterThan(0);
      expect(c.fail.length).toBeGreaterThan(0);
    }
    expect(ids).toEqual(
      expect.arrayContaining([
        'focal-point',
        'hierarchy',
        'spacing-rhythm',
        'alignment',
        'contrast',
        'density',
      ]),
    );
  });
  it('computes the maximum score from weights', () => {
    expect(rubricMaxScore()).toBe(RUBRIC.reduce((n, c) => n + c.weight * 2, 0));
  });
});
