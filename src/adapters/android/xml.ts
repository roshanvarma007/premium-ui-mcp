// Android Views (XML) adapter. Targets Material Components for Android 1.14.0 with
// Material 3 themes. Attribute and style names were verified against that library's R.txt.
// Output: colors (values / values-night), themes, type styles, dimens, shape appearances,
// font resources and shape drawables for plain views.
import type { Direction } from '../../schema/direction.schema.js';
import {
  families,
  fontSlug,
  generatedHeader,
  num,
  type ResolvedPalette,
  resolvePalette,
  spacingTokens,
  typeRoles,
  weightName,
} from '../model.js';
import type { Adapter, AdapterOptions, GeneratedFile } from '../types.js';
import { bundledFontFiles } from './compose.js';
import { FONT_CERTS_XML } from './font-certs.js';

const RES = 'app/src/main/res';

const COLOR_KEYS: Array<keyof ResolvedPalette> = [
  'bg',
  'surface',
  'surface_alt',
  'text',
  'text_muted',
  'border',
  'border_strong',
  'accent',
  'on_accent',
  'link',
  'success',
  'on_success',
  'warning',
  'on_warning',
  'error',
  'on_error',
];

const xmlHeader = (d: Direction) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<!-- ${generatedHeader(d, '').trim().replace(/\n /g, '\n     ')} -->`;

const c = (k: keyof ResolvedPalette) => `@color/ds_${k}`;

function colorsXml(
  d: Direction,
  p: ResolvedPalette,
  lightBars: boolean,
  inverseAccent: string,
): string {
  const items = COLOR_KEYS.map((k) => `    <color name="ds_${k}">${p[k]}</color>`).join('\n');
  return `${xmlHeader(d)}
<resources>
${items}
    <!-- accent of the opposite theme, for inverse surfaces such as snackbars -->
    <color name="ds_accent_inverse">${inverseAccent}</color>
    <!-- true when system bar icons should be dark (light backgrounds) -->
    <bool name="ds_light_system_bars">${lightBars}</bool>
</resources>
`;
}

/** Font resource name for a family + weight: @font/manrope_semibold */
function fontRes(name: string, weight: number): string {
  return `${fontSlug(name)}_${weightName(weight)}`;
}

function familyFor(d: Direction, key: 'display' | 'body' | 'mono') {
  if (key === 'display') return d.typography.display_family;
  if (key === 'mono') return d.typography.mono_family ?? d.typography.body_family;
  return d.typography.body_family;
}

const ROLE_STYLE: Record<string, string> = {
  display: 'Display',
  headline: 'Headline',
  title: 'Title',
  body: 'Body',
  body_small: 'BodySmall',
  label: 'Label',
  caption: 'Caption',
};

function typeXml(d: Direction): string {
  const tabular = d.typography.numerals === 'tabular';
  const styles = typeRoles(d).map(({ role, style, family }) => {
    const font = fontRes(familyFor(d, family).name, style.weight);
    const items = [
      `        <item name="android:fontFamily">@font/${font}</item>`,
      `        <item name="fontFamily">@font/${font}</item>`,
      `        <item name="android:textSize">${num(style.size)}sp</item>`,
      `        <item name="lineHeight">${num(style.line_height)}sp</item>`,
      `        <item name="android:letterSpacing">${num(style.letter_spacing)}</item>`,
      `        <item name="android:textColor">?attr/colorOnSurface</item>`,
      ...(tabular ? ['        <item name="android:fontFeatureSettings">tnum</item>'] : []),
    ];
    return `    <!-- ${role}: ${num(style.size)}sp / ${num(style.line_height)}sp, weight ${style.weight} -->\n    <style name="TextAppearance.App.${ROLE_STYLE[role]}" parent="TextAppearance.Material3.BodyLarge">\n${items.join('\n')}\n    </style>`;
  });
  const title = d.typography.scale.title;
  const bodySmall = d.typography.scale.body_small;
  const buttonFont = fontRes(d.typography.body_family.name, title.weight);
  const button = `    <!-- Buttons: body-small size at the title weight -->\n    <style name="TextAppearance.App.Button" parent="TextAppearance.App.BodySmall">\n        <item name="android:fontFamily">@font/${buttonFont}</item>\n        <item name="fontFamily">@font/${buttonFont}</item>\n        <item name="android:textSize">${num(bodySmall.size)}sp</item>\n    </style>`;
  return `${xmlHeader(d)}
<resources>
    <!-- The seven type roles. Use only these; never set textSize in layouts. -->
${styles.join('\n\n')}

${button}
</resources>
`;
}

function dimensXml(d: Direction): string {
  const space = spacingTokens(d)
    .map((s) => `    <dimen name="ds_space_${s.name}">${num(s.value)}dp</dimen>`)
    .join('\n');
  const elevation = d.elevation.levels
    .map(
      (l) => `    <dimen name="ds_elevation_${fontSlug(l.name)}">${num(l.elevation_dp)}dp</dimen>`,
    )
    .join('\n');
  return `${xmlHeader(d)}
<resources>
    <!-- Spacing on a ${d.spacing.base}dp grid. ds_space_4 = ${4 * d.spacing.base}dp. -->
${space}

    <!-- Radii. ${d.radius.usage} -->
    <dimen name="ds_radius_sm">${num(d.radius.sm)}dp</dimen>
    <dimen name="ds_radius_md">${num(d.radius.md)}dp</dimen>
    <dimen name="ds_radius_lg">${num(d.radius.lg)}dp</dimen>

    <!-- Elevation (${d.elevation.style}) -->
${elevation}

    <dimen name="ds_border">1dp</dimen>
    <dimen name="ds_touch_target">48dp</dimen>
</resources>
`;
}

function shapesXml(d: Direction): string {
  const shape = (name: string, dimen: string) =>
    `    <style name="ShapeAppearance.App.${name}" parent="">\n        <item name="cornerFamily">rounded</item>\n        <item name="cornerSize">@dimen/${dimen}</item>\n    </style>`;
  return `${xmlHeader(d)}
<resources>
${shape('Small', 'ds_radius_sm')}

${shape('Medium', 'ds_radius_md')}

${shape('Large', 'ds_radius_lg')}

    <style name="ShapeAppearance.App.Full" parent="">
        <item name="cornerFamily">rounded</item>
        <item name="cornerSize">50%</item>
    </style>
</resources>
`;
}

const M3_TEXT: Array<[string, string]> = [
  ['DisplayLarge', 'Display'],
  ['DisplayMedium', 'Display'],
  ['DisplaySmall', 'Display'],
  ['HeadlineLarge', 'Headline'],
  ['HeadlineMedium', 'Headline'],
  ['HeadlineSmall', 'Headline'],
  ['TitleLarge', 'Title'],
  ['TitleMedium', 'Title'],
  ['TitleSmall', 'Button'],
  ['BodyLarge', 'Body'],
  ['BodyMedium', 'BodySmall'],
  ['BodySmall', 'Caption'],
  ['LabelLarge', 'Button'],
  ['LabelMedium', 'Label'],
  ['LabelSmall', 'Label'],
];

function themesXml(d: Direction, o: AdapterOptions): string {
  const parent =
    o.mode === 'both'
      ? 'Theme.Material3.DayNight.NoActionBar'
      : o.mode === 'dark'
        ? 'Theme.Material3.Dark.NoActionBar'
        : 'Theme.Material3.Light.NoActionBar';
  const item = (name: string, value: string) => `        <item name="${name}">${value}</item>`;
  const roles: string[] = [];
  for (const prefix of ['Primary', 'Secondary', 'Tertiary']) {
    roles.push(
      item(`color${prefix}`, c('accent')),
      item(`colorOn${prefix}`, c('on_accent')),
      item(`color${prefix}Container`, c('surface_alt')),
      item(`colorOn${prefix}Container`, c('text')),
      item(`color${prefix}Fixed`, c('surface_alt')),
      item(`color${prefix}FixedDim`, c('surface_alt')),
      item(`colorOn${prefix}Fixed`, c('text')),
      item(`colorOn${prefix}FixedVariant`, c('text_muted')),
    );
  }
  const colors = [
    ...roles,
    item('colorPrimaryInverse', '@color/ds_accent_inverse'),
    item('android:colorBackground', c('bg')),
    item('colorOnBackground', c('text')),
    item('colorSurface', c('surface')),
    item('colorOnSurface', c('text')),
    item('colorSurfaceVariant', c('surface_alt')),
    item('colorOnSurfaceVariant', c('text_muted')),
    item('colorSurfaceInverse', c('text')),
    item('colorOnSurfaceInverse', c('bg')),
    item('colorSurfaceBright', c('surface')),
    item('colorSurfaceDim', c('surface_alt')),
    item('colorSurfaceContainerLowest', c('surface')),
    item('colorSurfaceContainerLow', c('surface')),
    item('colorSurfaceContainer', c('surface')),
    item('colorSurfaceContainerHigh', c('surface')),
    item('colorSurfaceContainerHighest', c('surface_alt')),
    item('colorOutline', c('border_strong')),
    item('colorOutlineVariant', c('border')),
    item('colorError', c('error')),
    item('colorOnError', c('on_error')),
    item('colorErrorContainer', c('surface_alt')),
    item('colorOnErrorContainer', c('text')),
  ];
  const text = M3_TEXT.flatMap(([m3, app]) => [
    item(`textAppearance${m3}`, `@style/TextAppearance.App.${app}`),
    item(`textAppearance${m3}Emphasized`, `@style/TextAppearance.App.${app}`),
  ]);
  const body = d.typography.body_family;
  const bodyFont = fontRes(body.name, d.typography.scale.body.weight);
  return `${xmlHeader(d)}
<resources>
    <!-- App theme: every Material 3 color role, type role and shape is mapped to the
         direction, so no component falls back to the baseline purple scheme. -->
    <style name="Theme.App" parent="${parent}">
        <!-- Colors -->
${colors.join('\n')}

        <!-- Type -->
${item('android:fontFamily', `@font/${bodyFont}`)}
${item('fontFamily', `@font/${bodyFont}`)}
${text.join('\n')}

        <!-- Shapes -->
${item('shapeAppearanceCornerExtraSmall', '@style/ShapeAppearance.App.Small')}
${item('shapeAppearanceCornerSmall', '@style/ShapeAppearance.App.Small')}
${item('shapeAppearanceCornerMedium', '@style/ShapeAppearance.App.Medium')}
${item('shapeAppearanceCornerLarge', '@style/ShapeAppearance.App.Large')}
${item('shapeAppearanceCornerExtraLarge', '@style/ShapeAppearance.App.Large')}
${item('shapeAppearanceSmallComponent', '@style/ShapeAppearance.App.Medium')}
${item('shapeAppearanceMediumComponent', '@style/ShapeAppearance.App.Medium')}
${item('shapeAppearanceLargeComponent', '@style/ShapeAppearance.App.Large')}

        <!-- Components -->
${item('materialButtonStyle', '@style/Widget.App.Button')}
${item('materialButtonOutlinedStyle', '@style/Widget.App.Button.Outlined')}
${item('materialCardViewStyle', '@style/Widget.App.Card')}
${item('textInputStyle', '@style/Widget.App.TextInput')}

        <!-- Window: background matches bg so there is no flash on launch -->
${item('android:windowBackground', c('bg'))}
${item('android:windowLightStatusBar', '@bool/ds_light_system_bars')}
${item('android:windowLightNavigationBar', '@bool/ds_light_system_bars')}
    </style>

    <!-- Primary button: solid accent, md radius, 48dp minimum height. One per screen. -->
    <style name="Widget.App.Button" parent="Widget.Material3.Button">
${item('backgroundTint', c('accent'))}
${item('android:textColor', c('on_accent'))}
${item('android:textAppearance', '@style/TextAppearance.App.Button')}
${item('shapeAppearance', '@style/ShapeAppearance.App.Medium')}
${item('android:minHeight', '@dimen/ds_touch_target')}
${item('android:insetTop', '0dp')}
${item('android:insetBottom', '0dp')}
    </style>

    <!-- Secondary button: 1dp border_strong outline, text color label. -->
    <style name="Widget.App.Button.Outlined" parent="Widget.Material3.Button.OutlinedButton">
${item('strokeColor', c('border_strong'))}
${item('android:textColor', c('text'))}
${item('android:textAppearance', '@style/TextAppearance.App.Button')}
${item('shapeAppearance', '@style/ShapeAppearance.App.Medium')}
${item('android:minHeight', '@dimen/ds_touch_target')}
${item('android:insetTop', '0dp')}
${item('android:insetBottom', '0dp')}
    </style>

    <!-- Card: surface fill, hairline border, no shadow unless interactive. -->
    <style name="Widget.App.Card" parent="Widget.Material3.CardView.Outlined">
${item('cardBackgroundColor', c('surface'))}
${item('strokeColor', c('border'))}
${item('strokeWidth', '@dimen/ds_border')}
${item('cardElevation', '@dimen/ds_elevation_none')}
${item('shapeAppearance', '@style/ShapeAppearance.App.Medium')}
    </style>

    <!-- Input: outlined, visible label always (never placeholder-only). -->
    <style name="Widget.App.TextInput" parent="Widget.Material3.TextInputLayout.OutlinedBox">
${item('boxStrokeColor', c('border_strong'))}
${item('shapeAppearance', '@style/ShapeAppearance.App.Medium')}
${item('hintTextAppearance', '@style/TextAppearance.App.Label')}
    </style>
</resources>
`;
}

function drawables(d: Direction): GeneratedFile[] {
  const head = xmlHeader(d);
  const rect = (fill: string, stroke?: string) =>
    `<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="${fill}" />${stroke ? `\n    <stroke android:width="@dimen/ds_border" android:color="${stroke}" />` : ''}
    <corners android:radius="@dimen/ds_radius_md" />
</shape>`;
  return [
    {
      path: `${RES}/drawable/ds_bg_button_primary.xml`,
      content: `${head}
<!-- Primary button background for plain views (MaterialButton uses Widget.App.Button). -->
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="?attr/colorControlHighlight">
    <item>
        ${rect(c('accent')).replace(/\n/g, '\n        ')}
    </item>
</ripple>
`,
    },
    {
      path: `${RES}/drawable/ds_bg_button_secondary.xml`,
      content: `${head}
<ripple xmlns:android="http://schemas.android.com/apk/res/android" android:color="?attr/colorControlHighlight">
    <item>
        ${rect('@android:color/transparent', c('border_strong')).replace(/\n/g, '\n        ')}
    </item>
</ripple>
`,
    },
    {
      path: `${RES}/drawable/ds_bg_card.xml`,
      content: `${head}\n<!-- Card: surface fill with a hairline border, no shadow. -->\n${rect(c('surface'), c('border'))}\n`,
    },
    {
      path: `${RES}/drawable/ds_bg_input.xml`,
      content: `${head}\n${rect(c('surface'), c('border_strong'))}\n`,
    },
  ];
}

/** Downloadable font XML (Google Play services provider), one per family + weight. */
function downloadableFontXml(d: Direction, name: string, weight: number): string {
  return `${xmlHeader(d)}
<font-family xmlns:app="http://schemas.android.com/apk/res-auto"
    app:fontProviderAuthority="com.google.android.gms.fonts"
    app:fontProviderPackage="com.google.android.gms"
    app:fontProviderQuery="name=${name}&amp;weight=${weight}"
    app:fontProviderCerts="@array/com_google_android_gms_fonts_certs">
</font-family>
`;
}

export const androidXmlAdapter: Adapter = (d, o) => {
  const files: GeneratedFile[] = [];
  const light = resolvePalette(d.color.light);
  const dark = resolvePalette(d.color.dark);
  if (o.mode === 'dark') {
    files.push({
      path: `${RES}/values/colors.xml`,
      content: colorsXml(d, dark, false, dark.accent),
    });
  } else {
    files.push({
      path: `${RES}/values/colors.xml`,
      content: colorsXml(d, light, true, o.mode === 'both' ? dark.accent : light.accent),
    });
    if (o.mode === 'both') {
      files.push({
        path: `${RES}/values-night/colors.xml`,
        content: colorsXml(d, dark, false, light.accent),
      });
    }
  }
  files.push(
    { path: `${RES}/values/themes.xml`, content: themesXml(d, o) },
    { path: `${RES}/values/type.xml`, content: typeXml(d) },
    { path: `${RES}/values/dimens.xml`, content: dimensXml(d) },
    { path: `${RES}/values/shapes.xml`, content: shapesXml(d) },
    ...drawables(d),
  );

  const fonts = bundledFontFiles(d);
  const next: string[] = [
    'Add implementation("com.google.android.material:material:1.14.0") (or newer). The activity must extend AppCompatActivity, and the manifest <application> needs android:theme="@style/Theme.App".',
  ];
  if (o.fontSource === 'google-fonts') {
    for (const f of fonts) {
      files.push({
        path: `${RES}/font/${f.file.replace('.ttf', '.xml')}`,
        content: downloadableFontXml(d, f.family, f.weight),
      });
    }
    files.push({ path: `${RES}/values-v23/font_certs.xml`, content: FONT_CERTS_XML });
    files.push({
      path: `${RES}/values/preloaded_fonts.xml`,
      content: `${xmlHeader(d)}\n<resources>\n    <array name="preloaded_fonts" translatable="false">\n${fonts.map((f) => `        <item>@font/${f.file.replace('.ttf', '')}</item>`).join('\n')}\n    </array>\n</resources>\n`,
    });
    next.push(
      'Downloadable Fonts (opt-in): add <meta-data android:name="preloaded_fonts" android:resource="@array/preloaded_fonts" /> inside <application> in AndroidManifest.xml. Fonts load from Google Play services; without it, text falls back to the system font.',
    );
  } else {
    next.push(
      `Add these font files to ${RES}/font/ (static TTF instances, open license): ${fonts.map((f) => f.file).join(', ')}. Get them from each family's Google Fonts page (static/ folder) and rename them exactly. Licenses: ${[
        ...new Set(families(d).map((f) => `${f.family.name} (${f.family.license})`)),
      ].join(', ')}.`,
    );
  }
  next.push(
    'In layouts use only theme attributes and resources: android:textAppearance="?attr/textAppearanceBodyLarge" (or @style/TextAppearance.App.*), @color/ds_*, @dimen/ds_space_*, @dimen/ds_radius_*. Never hardcode #RRGGBB, text sizes or dp padding values.',
    'Use MaterialButton (primary) and style="?attr/materialButtonOutlinedStyle" (secondary), MaterialCardView, and TextInputLayout with a visible hint as label. The ds_bg_* drawables are for plain views that cannot use those components.',
  );
  return { files, next_steps: next };
};
