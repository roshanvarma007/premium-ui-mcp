import { describe, expect, it } from 'vitest';
import { androidXmlAdapter } from '../src/adapters/android/xml.js';
import { type AdapterOptions, DEFAULT_OPTIONS } from '../src/adapters/types.js';
import { getDirection } from '../src/directions/index.js';

const d = getDirection('fintech-trust')!;
const run = (o: Partial<AdapterOptions> = {}) => androidXmlAdapter(d, { ...DEFAULT_OPTIONS, ...o });
const file = (o: Partial<AdapterOptions>, suffix: string) =>
  run(o).files.find((f) => f.path.endsWith(suffix))!.content;

describe('android-xml adapter', () => {
  it('emits colors (day + night), themes, type, dimens, shapes and drawables', () => {
    expect(run().files.map((f) => f.path)).toEqual([
      'app/src/main/res/values/colors.xml',
      'app/src/main/res/values-night/colors.xml',
      'app/src/main/res/values/themes.xml',
      'app/src/main/res/values/type.xml',
      'app/src/main/res/values/dimens.xml',
      'app/src/main/res/values/shapes.xml',
      'app/src/main/res/drawable/ds_bg_button_primary.xml',
      'app/src/main/res/drawable/ds_bg_button_secondary.xml',
      'app/src/main/res/drawable/ds_bg_card.xml',
      'app/src/main/res/drawable/ds_bg_input.xml',
    ]);
  });

  it('designs night colors separately and flips system bar icons', () => {
    expect(file({}, 'values/colors.xml')).toContain('<color name="ds_accent">#0F6B4F</color>');
    expect(file({}, 'values-night/colors.xml')).toContain(
      '<color name="ds_accent">#5CC49B</color>',
    );
    expect(file({}, 'values/colors.xml')).toContain(
      '<bool name="ds_light_system_bars">true</bool>',
    );
    expect(file({}, 'values-night/colors.xml')).toContain(
      '<bool name="ds_light_system_bars">false</bool>',
    );
  });

  it('uses the right Material 3 parent theme per mode', () => {
    expect(file({}, 'themes.xml')).toContain('parent="Theme.Material3.DayNight.NoActionBar"');
    expect(file({ mode: 'light' }, 'themes.xml')).toContain(
      'parent="Theme.Material3.Light.NoActionBar"',
    );
    expect(file({ mode: 'dark' }, 'themes.xml')).toContain(
      'parent="Theme.Material3.Dark.NoActionBar"',
    );
    expect(run({ mode: 'light' }).files.some((f) => f.path.includes('values-night'))).toBe(false);
  });

  it('maps every color role, including fixed and surface-container roles', () => {
    const themes = file({}, 'themes.xml');
    for (const attr of [
      'colorPrimary',
      'colorOnPrimaryFixedVariant',
      'colorTertiaryFixedDim',
      'colorSurfaceContainerHighest',
      'colorOutlineVariant',
      'android:colorBackground',
      'textAppearanceLabelLargeEmphasized',
    ]) {
      expect(themes).toContain(`<item name="${attr}">`);
    }
    expect(themes).not.toMatch(/#[0-9A-F]{6}/i);
  });

  it('sets text sizes in sp and spacing in dp only', () => {
    const type = file({}, 'type.xml');
    expect(type).toContain('<item name="android:textSize">16sp</item>');
    expect(type).toContain('<item name="lineHeight">24sp</item>');
    expect(type).not.toMatch(/textSize">\d+(dp|px)/);
    expect(file({}, 'dimens.xml')).toContain('<dimen name="ds_space_4">16dp</dimen>');
    expect(file({}, 'dimens.xml')).toContain('<dimen name="ds_touch_target">48dp</dimen>');
  });

  it('bundles fonts by default and generates provider fonts when opted in', () => {
    expect(run().files.some((f) => f.path.includes('/font/'))).toBe(false);
    const dl = run({ fontSource: 'google-fonts' });
    const manrope = dl.files.find((f) => f.path.endsWith('font/manrope_semibold.xml'))!.content;
    expect(manrope).toContain('app:fontProviderQuery="name=Manrope&amp;weight=600"');
    expect(dl.files.some((f) => f.path.endsWith('values/preloaded_fonts.xml'))).toBe(true);
  });

  it('is deterministic and matches snapshots', () => {
    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    for (const f of run().files) expect(f.content).toMatchSnapshot(f.path);
  });
});
