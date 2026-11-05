// Keeps the compile-checked sample projects in sync with the generators.
// Regenerate after changing an adapter or direction: npm run gen:samples
import { describe, expect, it } from 'vitest';
import { generateTheme } from '../src/adapters/index.js';
import { type AdapterOptions, DEFAULT_OPTIONS } from '../src/adapters/types.js';
import { getDirection } from '../src/directions/index.js';
import type { PlatformId } from '../src/platforms.js';

const direction = getDirection('fintech-trust')!;
const opts = (o: Partial<AdapterOptions>): AdapterOptions => ({ ...DEFAULT_OPTIONS, ...o });

function gen(platforms: PlatformId[], o: Partial<AdapterOptions>) {
  return generateTheme(direction, platforms, opts(o)).files;
}

describe('examples/compose-sample', () => {
  const root = '../examples/compose-sample';
  const pkg = 'com.premiumui.sample';
  const themeDir = 'app/src/main/java/com/premiumui/sample/ui/theme';

  it('bundled-font theme matches the generator', async () => {
    for (const f of gen(['compose'], { packageName: pkg })) {
      const path = f.path.endsWith('/Type.kt')
        ? f.path.replace('app/src/main/', 'app/src/bundled/')
        : f.path;
      await expect(f.content).toMatchFileSnapshot(`${root}/${path}`);
    }
  });

  it('downloadable-font Type.kt and certs match the generator', async () => {
    const files = gen(['compose'], { packageName: pkg, fontSource: 'google-fonts' });
    const type = files.find((f) => f.path === `${themeDir}/Type.kt`)!;
    await expect(type.content).toMatchFileSnapshot(
      `${root}/app/src/downloadable/java/com/premiumui/sample/ui/theme/Type.kt`,
    );
    const certs = files.find((f) => f.path.endsWith('font_certs.xml'))!;
    await expect(certs.content).toMatchFileSnapshot(
      `${root}/app/src/downloadable/res/values-v23/font_certs.xml`,
    );
  });
});
