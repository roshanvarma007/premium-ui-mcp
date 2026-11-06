import { describe, expect, it } from 'vitest';
import { bundledFontFiles, composeAdapter } from '../src/adapters/android/compose.js';
import { type AdapterOptions, DEFAULT_OPTIONS } from '../src/adapters/types.js';
import { getDirection } from '../src/directions/index.js';

const d = getDirection('fintech-trust')!;
const run = (o: Partial<AdapterOptions> = {}) => composeAdapter(d, { ...DEFAULT_OPTIONS, ...o });
const file = (o: Partial<AdapterOptions>, name: string) =>
  run(o).files.find((f) => f.path.endsWith(`/${name}`))!.content;

describe('compose adapter', () => {
  it('emits the five theme files under the package path', () => {
    const paths = run({ packageName: 'com.acme.wallet' }).files.map((f) => f.path);
    expect(paths).toEqual([
      'app/src/main/java/com/acme/wallet/ui/theme/Color.kt',
      'app/src/main/java/com/acme/wallet/ui/theme/Type.kt',
      'app/src/main/java/com/acme/wallet/ui/theme/Shape.kt',
      'app/src/main/java/com/acme/wallet/ui/theme/Spacing.kt',
      'app/src/main/java/com/acme/wallet/ui/theme/Theme.kt',
    ]);
  });

  it('is deterministic byte for byte', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
  });

  it('maps every Material 3 color role so nothing falls back to baseline purple', () => {
    const theme = file({}, 'Theme.kt');
    for (const role of [
      'primary',
      'secondary',
      'tertiary',
      'surfaceContainerHighest',
      'surfaceVariant',
      'outlineVariant',
      'inversePrimary',
      'primaryFixed',
      'onTertiaryFixedVariant',
    ]) {
      expect(theme).toMatch(new RegExp(`\\n\\s+${role} = `));
    }
    expect(theme).not.toMatch(/6200EE|6750A4/i);
  });

  it('uses only direction colors, as 0xFFRRGGBB literals', () => {
    const color = file({}, 'Color.kt');
    expect(color).toContain('accent = Color(0xFF0F6B4F)');
    expect(color).toContain('accent = Color(0xFF5CC49B)');
    expect(color).toContain('val DarkAppColors');
  });

  it('light-only and dark-only modes drop the unused palette and the dark switch', () => {
    const lightColor = file({ mode: 'light' }, 'Color.kt');
    expect(lightColor).not.toContain('DarkAppColors');
    const lightTheme = file({ mode: 'light' }, 'Theme.kt');
    expect(lightTheme).not.toContain('isSystemInDarkTheme');
    expect(lightTheme).toContain('fun AppTheme(content: @Composable () -> Unit)');
    expect(file({ mode: 'dark' }, 'Color.kt')).not.toContain('LightAppColors');
  });

  it('bundled fonts reference res/font files; downloadable uses the Google provider', () => {
    const bundled = file({}, 'Type.kt');
    expect(bundled).toContain('Font(R.font.manrope_regular, FontWeight.W400)');
    expect(bundled).not.toContain('GoogleFont');
    const dl = run({ fontSource: 'google-fonts' });
    const type = dl.files.find((f) => f.path.endsWith('Type.kt'))!.content;
    expect(type).toContain('GoogleFont("Manrope")');
    expect(type).toContain('R.array.com_google_android_gms_fonts_certs');
    expect(dl.files.some((f) => f.path.endsWith('values-v23/font_certs.xml'))).toBe(true);
  });

  it('lists exactly the font files the bundled Type.kt references', () => {
    const type = file({}, 'Type.kt');
    for (const f of bundledFontFiles(d)) {
      expect(type).toContain(`R.font.${f.file.replace('.ttf', '')}`);
    }
    expect(bundledFontFiles(d).map((f) => f.file)).toEqual([
      'fraunces_semibold.ttf',
      'manrope_regular.ttf',
      'manrope_medium.ttf',
      'manrope_semibold.ttf',
      'jetbrains_mono_regular.ttf',
    ]);
  });

  it('applies tabular numerals and negative letter spacing correctly', () => {
    const type = file({}, 'Type.kt');
    expect(type).toContain('letterSpacing = (-0.02).em');
    expect(type).toContain('fontFeatureSettings = "tnum"');
  });

  it('names spacing tokens by grid multiples', () => {
    const spacing = file({}, 'Spacing.kt');
    expect(spacing).toContain('val s4 = 16.dp');
    expect(spacing).toContain('val s24 = 96.dp');
  });

  it('next_steps explain dependencies, fonts and token-only usage', () => {
    const steps = run().next_steps.join('\n');
    expect(steps).toMatch(/compose-bom/);
    expect(steps).toMatch(/res\/font/);
    expect(steps).toMatch(/Never write Color\(0x/);
  });

  it('matches snapshots (both modes, bundled)', () => {
    for (const f of run({ packageName: 'com.example.app' }).files) {
      expect(f.content).toMatchSnapshot(f.path);
    }
  });
});
