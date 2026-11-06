// Loads and validates layout blueprints. Add a blueprint: create <id>.json and list it here.
import { type Blueprint, BlueprintSchema } from '../schema/blueprint.schema.js';
import dashboard from './dashboard.json' with { type: 'json' };
import ecommerce from './ecommerce.json' with { type: 'json' };
import gameUi from './game-ui.json' with { type: 'json' };
import landingPage from './landing-page.json' with { type: 'json' };
import mobileApp from './mobile-app.json' with { type: 'json' };

const RAW: readonly unknown[] = [landingPage, mobileApp, gameUi, dashboard, ecommerce];

let cache: readonly Blueprint[] | undefined;

export function getBlueprints(): readonly Blueprint[] {
  if (cache) return cache;
  cache = RAW.map((raw) => {
    const parsed = BlueprintSchema.safeParse(raw);
    if (!parsed.success) {
      const id = (raw as { id?: string }).id ?? '<unknown>';
      const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
      throw new Error(`Invalid blueprint "${id}":\n${issues.join('\n')}`);
    }
    const { $schema: _schema, ...blueprint } = parsed.data;
    return blueprint;
  });
  return cache;
}

export function rawBlueprints(): readonly unknown[] {
  return RAW;
}

const ALIASES: Record<string, Blueprint['surface']> = {
  landing: 'landing',
  'landing-page': 'landing',
  website: 'landing',
  marketing: 'landing',
  homepage: 'landing',
  app: 'app',
  'mobile-app': 'app',
  mobile: 'app',
  screen: 'app',
  game: 'game',
  'game-ui': 'game',
  hud: 'game',
  dashboard: 'dashboard',
  admin: 'dashboard',
  analytics: 'dashboard',
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  shop: 'ecommerce',
  store: 'ecommerce',
  product: 'ecommerce',
};

export function resolveSurface(input: string): Blueprint['surface'] | undefined {
  return ALIASES[
    input
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-')
  ];
}

export function getBlueprint(surface: string): Blueprint | undefined {
  const s = resolveSurface(surface);
  return s ? getBlueprints().find((b) => b.surface === s) : undefined;
}
