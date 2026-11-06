import type { PlatformId } from '../platforms.js';
import type { Direction } from '../schema/direction.schema.js';
import { composeAdapter } from './android/compose.js';
import { androidXmlAdapter } from './android/xml.js';
import type { Adapter, AdapterOptions, AdapterOutput, GeneratedFile } from './types.js';
import { htmlAdapter } from './web/html.js';
import { nextjsAdapter } from './web/nextjs.js';
import { reactAdapter } from './web/react.js';
import { tailwindAdapter } from './web/tailwind.js';

/** Adapters available in this build. Platforms missing here are on the roadmap. */
export const ADAPTERS: Partial<Record<PlatformId, Adapter>> = {
  html: htmlAdapter,
  tailwind: tailwindAdapter,
  react: reactAdapter,
  nextjs: nextjsAdapter,
  compose: composeAdapter,
  'android-xml': androidXmlAdapter,
};

export function supportedPlatforms(): PlatformId[] {
  return Object.keys(ADAPTERS) as PlatformId[];
}

export class UnsupportedPlatformError extends Error {}

/**
 * Runs one or more adapters and merges their output. When two adapters emit the same
 * path (for example the shared tokens.css), the first one wins and must be identical.
 */
export function generateTheme(
  direction: Direction,
  platforms: readonly PlatformId[],
  options: AdapterOptions,
): AdapterOutput {
  const files = new Map<string, GeneratedFile>();
  const next: string[] = [];
  for (const platform of platforms) {
    const adapter = ADAPTERS[platform];
    if (!adapter) {
      throw new UnsupportedPlatformError(
        `Platform "${platform}" is not supported yet. Supported: ${supportedPlatforms().join(', ')}.`,
      );
    }
    const out = adapter(direction, { ...options, together: platforms });
    for (const f of out.files) {
      const existing = files.get(f.path);
      if (existing && existing.content !== f.content) {
        throw new Error(`Adapters disagree on ${f.path}`);
      }
      files.set(f.path, f);
    }
    for (const step of out.next_steps) if (!next.includes(step)) next.push(step);
  }
  return { files: [...files.values()], next_steps: next };
}
