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

describe('examples/web-sample (plain HTML)', () => {
  it('matches the generator', async () => {
    for (const f of gen(['html'], {})) {
      await expect(f.content).toMatchFileSnapshot(`../examples/web-sample/${f.path}`);
    }
  });
});

describe('examples/tailwind-sample (HTML + Tailwind v4)', () => {
  it('matches the generator', async () => {
    for (const f of gen(['html', 'tailwind'], {})) {
      await expect(f.content).toMatchFileSnapshot(`../examples/tailwind-sample/${f.path}`);
    }
  });
});

describe('examples/react-sample (Vite + React, TypeScript, plain CSS)', () => {
  it('matches the generator', async () => {
    for (const f of gen(['react'], { language: 'ts' })) {
      await expect(f.content).toMatchFileSnapshot(`../examples/react-sample/${f.path}`);
    }
  });
});

describe('examples/nextjs-sample (Next.js + Tailwind, both routers, TypeScript)', () => {
  it('App Router output matches the generator', async () => {
    for (const f of gen(['nextjs', 'tailwind'], { language: 'ts', router: 'app' })) {
      await expect(f.content).toMatchFileSnapshot(`../examples/nextjs-sample/${f.path}`);
    }
  });
  it('Pages Router output matches the generator', async () => {
    for (const f of gen(['nextjs', 'tailwind'], { language: 'ts', router: 'pages' })) {
      await expect(f.content).toMatchFileSnapshot(`../examples/nextjs-sample/${f.path}`);
    }
  });
});

describe('examples/android-xml-sample (Views + Material Components)', () => {
  const root = '../examples/android-xml-sample';
  it('bundled-font resources match the generator', async () => {
    for (const f of gen(['android-xml'], { packageName: 'com.premiumui.xmlsample' })) {
      await expect(f.content).toMatchFileSnapshot(`${root}/${f.path}`);
    }
  });
  it('downloadable-font resources match the generator (flavor source set)', async () => {
    const files = gen(['android-xml'], {
      packageName: 'com.premiumui.xmlsample',
      fontSource: 'google-fonts',
    });
    for (const f of files.filter(
      (x) =>
        x.path.includes('/font/') ||
        x.path.includes('font_certs') ||
        x.path.includes('preloaded_fonts'),
    )) {
      await expect(f.content).toMatchFileSnapshot(
        `${root}/${f.path.replace('app/src/main/', 'app/src/downloadable/')}`,
      );
    }
  });
});
