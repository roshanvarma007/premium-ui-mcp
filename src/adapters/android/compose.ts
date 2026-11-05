// Jetpack Compose adapter. Targets Material 3 (androidx.compose.material3 1.4, Compose BOM
// 2026.09) and Kotlin 2.4. Verified against the official Compose samples and the
// Material 3 for Compose docs. Generates Color.kt, Type.kt, Shape.kt, Spacing.kt, Theme.kt.
import type { Direction, FontFamily } from '../../schema/direction.schema.js';
import {
  easingPoints,
  type FamilyKey,
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
import { FONT_CERTS_XML } from './font-certs.js';

const COLOR_FIELDS: Array<[keyof ResolvedPalette, string]> = [
  ['bg', 'bg'],
  ['surface', 'surface'],
  ['surface_alt', 'surfaceAlt'],
  ['text', 'text'],
  ['text_muted', 'textMuted'],
  ['border', 'border'],
  ['border_strong', 'borderStrong'],
  ['accent', 'accent'],
  ['on_accent', 'onAccent'],
  ['link', 'link'],
  ['success', 'success'],
  ['on_success', 'onSuccess'],
  ['warning', 'warning'],
  ['on_warning', 'onWarning'],
  ['error', 'error'],
  ['on_error', 'onError'],
];

const ROLE_PROPS: Record<string, string> = {
  display: 'display',
  headline: 'headline',
  title: 'title',
  body: 'body',
  body_small: 'bodySmall',
  label: 'label',
  caption: 'caption',
};

function kColor(hex: string): string {
  return `Color(0xFF${hex.slice(1).toUpperCase()})`;
}

function pkgPath(pkg: string): string {
  return pkg.replace(/\./g, '/');
}

function familyVal(name: string): string {
  return `${name.replace(/[^A-Za-z0-9]+/g, '')}FontFamily`;
}

/** Unique font families by name, with the union of weights used by every role. */
function fontFamilies(d: Direction) {
  const byName = new Map<string, { family: FontFamily; weights: Set<number>; keys: FamilyKey[] }>();
  for (const { key, family } of families(d)) {
    const entry = byName.get(family.name) ?? { family, weights: new Set<number>(), keys: [] };
    for (const w of family.weights) entry.weights.add(w);
    entry.keys.push(key);
    byName.set(family.name, entry);
  }
  return [...byName.values()].map((e) => ({
    ...e,
    weights: [...e.weights].sort((a, b) => a - b),
    val: familyVal(e.family.name),
  }));
}

function familyValFor(d: Direction, key: FamilyKey): string {
  const fam =
    key === 'display'
      ? d.typography.display_family
      : key === 'mono'
        ? (d.typography.mono_family ?? d.typography.body_family)
        : d.typography.body_family;
  return familyVal(fam.name);
}

export function bundledFontFiles(
  d: Direction,
): Array<{ file: string; family: string; weight: number }> {
  return fontFamilies(d).flatMap((f) =>
    f.weights.map((w) => ({
      file: `${fontSlug(f.family.name)}_${weightName(w)}.ttf`,
      family: f.family.name,
      weight: w,
    })),
  );
}

function colorKt(d: Direction, o: AdapterOptions, pkg: string): string {
  const palettes: Array<['Light' | 'Dark', ResolvedPalette]> = [];
  if (o.mode !== 'dark') palettes.push(['Light', resolvePalette(d.color.light)]);
  if (o.mode !== 'light') palettes.push(['Dark', resolvePalette(d.color.dark)]);
  const fields = COLOR_FIELDS.map(([, prop]) => `    val ${prop}: Color,`).join('\n');
  const instances = palettes
    .map(([name, p]) => {
      const values = COLOR_FIELDS.map(([key, prop]) => `    ${prop} = ${kColor(p[key])},`).join(
        '\n',
      );
      return `val ${name}AppColors = AppColors(\n${values}\n    isDark = ${name === 'Dark'},\n)`;
    })
    .join('\n\n');
  return `${generatedHeader(d, '//')}
package ${pkg}

import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Color

/**
 * Every color in the design direction. Read them through AppTheme.colors.
 * accent is the only accent; success, warning and error are for meaning only.
 */
@Immutable
data class AppColors(
${fields}
    val isDark: Boolean,
)

${instances}
`;
}

function typeKt(d: Direction, o: AdapterOptions, pkg: string): string {
  const downloadable = o.fontSource === 'google-fonts';
  const fams = fontFamilies(d);
  const tabular = d.typography.numerals === 'tabular';
  const imports = [
    'androidx.compose.material3.Typography',
    'androidx.compose.runtime.Immutable',
    'androidx.compose.ui.text.TextStyle',
    'androidx.compose.ui.text.font.FontFamily',
    'androidx.compose.ui.text.font.FontWeight',
    'androidx.compose.ui.unit.em',
    'androidx.compose.ui.unit.sp',
    downloadable
      ? 'androidx.compose.ui.text.googlefonts.Font'
      : 'androidx.compose.ui.text.font.Font',
    ...(downloadable ? ['androidx.compose.ui.text.googlefonts.GoogleFont'] : []),
    `${o.packageName}.R`,
  ].sort();

  const familyDefs = fams
    .map((f) => {
      const fonts = f.weights
        .map((w) =>
          downloadable
            ? `    Font(googleFont = GoogleFont("${f.family.name}"), fontProvider = fontProvider, weight = FontWeight.W${w}),`
            : `    Font(R.font.${fontSlug(f.family.name)}_${weightName(w)}, FontWeight.W${w}),`,
        )
        .join('\n');
      return `/** ${f.family.name} (${f.family.license}). Fallback: ${f.family.fallback.join(', ')}. */\nval ${f.val} = FontFamily(\n${fonts}\n)`;
    })
    .join('\n\n');

  const provider = downloadable
    ? `
/** Downloadable Fonts via Google Play services. Requires res/values-v23/font_certs.xml. */
val fontProvider = GoogleFont.Provider(
    providerAuthority = "com.google.android.gms.fonts",
    providerPackage = "com.google.android.gms",
    certificates = R.array.com_google_android_gms_fonts_certs,
)
`
    : '';

  const roles = typeRoles(d);
  const style = (r: (typeof roles)[number]) =>
    [
      `fontFamily = ${familyValFor(d, r.family)}`,
      `fontWeight = FontWeight.W${r.style.weight}`,
      `fontSize = ${num(r.style.size)}.sp`,
      `lineHeight = ${num(r.style.line_height)}.sp`,
      `letterSpacing = ${r.style.letter_spacing < 0 ? `(${num(r.style.letter_spacing)})` : num(r.style.letter_spacing)}.em`,
      ...(tabular ? ['fontFeatureSettings = "tnum"'] : []),
    ]
      .map((l) => `        ${l},`)
      .join('\n');

  const appType = roles
    .map((r) => `    ${ROLE_PROPS[r.role]} = TextStyle(\n${style(r)}\n    ),`)
    .join('\n');
  const titleWeight = d.typography.scale.title.weight;

  return `${generatedHeader(d, '//')}
package ${pkg}

${imports.map((i) => `import ${i}`).join('\n')}
${provider}
${familyDefs}

/** The seven type roles of the direction. Do not add sizes outside this scale. */
@Immutable
data class AppTypography(
    val display: TextStyle,
    val headline: TextStyle,
    val title: TextStyle,
    val body: TextStyle,
    val bodySmall: TextStyle,
    val label: TextStyle,
    val caption: TextStyle,
)

val AppType = AppTypography(
${appType}
)

/** Material 3 roles mapped onto the same seven styles, so stock components match. */
val AppMaterialTypography = Typography(
    displayLarge = AppType.display,
    displayMedium = AppType.display,
    displaySmall = AppType.display,
    headlineLarge = AppType.headline,
    headlineMedium = AppType.headline,
    headlineSmall = AppType.headline,
    titleLarge = AppType.title,
    titleMedium = AppType.title,
    titleSmall = AppType.bodySmall.copy(fontWeight = FontWeight.W${titleWeight}),
    bodyLarge = AppType.body,
    bodyMedium = AppType.bodySmall,
    bodySmall = AppType.caption,
    labelLarge = AppType.bodySmall.copy(fontWeight = FontWeight.W${titleWeight}),
    labelMedium = AppType.label,
    labelSmall = AppType.label,
)
`;
}

function shapeKt(d: Direction, pkg: string): string {
  const r = d.radius;
  const rc = (v: number) => `RoundedCornerShape(${num(v)}.dp)`;
  return `${generatedHeader(d, '//')}
package ${pkg}

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.runtime.Immutable
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

/**
 * ${r.usage}
 */
@Immutable
data class AppShapes(
    val sm: Shape,
    val md: Shape,
    val lg: Shape,
    val full: Shape,
)

val AppShapeTokens = AppShapes(
    sm = ${rc(r.sm)},
    md = ${rc(r.md)},
    lg = ${rc(r.lg)},
    full = RoundedCornerShape(percent = 50),
)

val AppMaterialShapes = Shapes(
    extraSmall = ${rc(r.sm)},
    small = ${rc(r.sm)},
    medium = ${rc(r.md)},
    large = ${rc(r.lg)},
    extraLarge = ${rc(r.lg)},
)
`;
}

function spacingKt(d: Direction, pkg: string): string {
  const tokens = spacingTokens(d)
    .map((t) => `    val s${t.name} = ${num(t.value)}.dp`)
    .join('\n');
  return `${generatedHeader(d, '//')}
package ${pkg}

import androidx.compose.ui.unit.dp

/**
 * Spacing scale on a ${d.spacing.base}dp grid. Names are multiples of the base unit:
 * s4 = ${4 * d.spacing.base}dp. Use only these values for padding, gaps and offsets.
 */
object Spacing {
${tokens}

    /** Minimum touch target (Material accessibility guidance). */
    val minTouchTarget = 48.dp
}
`;
}

function themeKt(d: Direction, o: AdapterOptions, pkg: string): string {
  const [x1, y1, x2, y2] = easingPoints(d);
  const m = d.motion.duration_ms;
  const both = o.mode === 'both';
  const lightAccent = d.color.light.accent;
  const darkAccent = d.color.dark.accent;
  const inverseExpr = both
    ? `if (colors.isDark) ${kColor(lightAccent)} else ${kColor(darkAccent)}`
    : 'colors.accent';
  const elevation = d.elevation.levels
    .map(
      (l) =>
        `    val ${l.name.replace(/[^A-Za-z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ''))} = ${num(l.elevation_dp)}.dp`,
    )
    .join('\n');
  const colorsExpr = both
    ? 'if (darkTheme) DarkAppColors else LightAppColors'
    : o.mode === 'dark'
      ? 'DarkAppColors'
      : 'LightAppColors';
  const signature = both
    ? 'fun AppTheme(\n    darkTheme: Boolean = isSystemInDarkTheme(),\n    content: @Composable () -> Unit,\n)'
    : 'fun AppTheme(content: @Composable () -> Unit)';
  const defaultColors = o.mode === 'dark' ? 'DarkAppColors' : 'LightAppColors';
  const imports = [
    'androidx.compose.animation.core.CubicBezierEasing',
    'androidx.compose.material3.ColorScheme',
    'androidx.compose.material3.MaterialTheme',
    'androidx.compose.material3.darkColorScheme',
    'androidx.compose.material3.lightColorScheme',
    'androidx.compose.runtime.Composable',
    'androidx.compose.runtime.CompositionLocalProvider',
    'androidx.compose.runtime.ReadOnlyComposable',
    'androidx.compose.runtime.staticCompositionLocalOf',
    'androidx.compose.ui.graphics.Color',
    'androidx.compose.ui.unit.dp',
    ...(both ? ['androidx.compose.foundation.isSystemInDarkTheme'] : []),
  ].sort();

  return `${generatedHeader(d, '//')}
package ${pkg}

${imports.map((i) => `import ${i}`).join('\n')}

/** Elevation levels (${d.elevation.style}). Prefer borders; elevate only overlays and interactive layers. */
object AppElevation {
${elevation}
}

/**
 * Motion tokens.
${d.motion.rules.map((r) => ` * - ${r}`).join('\n')}
 */
object AppMotion {
    const val FAST_MS = ${m.fast}
    const val BASE_MS = ${m.base}
    const val SLOW_MS = ${m.slow}
    val Easing = CubicBezierEasing(${num(x1)}f, ${num(y1)}f, ${num(x2)}f, ${num(y2)}f)
}

private val LocalAppColors = staticCompositionLocalOf { ${defaultColors} }
private val LocalAppTypography = staticCompositionLocalOf { AppType }
private val LocalAppShapes = staticCompositionLocalOf { AppShapeTokens }

/**
 * Maps the direction onto every Material 3 color role, so stock components never fall
 * back to the baseline purple scheme.
 */
private fun AppColors.toColorScheme(inverseAccent: Color): ColorScheme {
    val base = if (isDark) darkColorScheme() else lightColorScheme()
    return base.copy(
        primary = accent,
        onPrimary = onAccent,
        primaryContainer = surfaceAlt,
        onPrimaryContainer = text,
        inversePrimary = inverseAccent,
        secondary = accent,
        onSecondary = onAccent,
        secondaryContainer = surfaceAlt,
        onSecondaryContainer = text,
        tertiary = accent,
        onTertiary = onAccent,
        tertiaryContainer = surfaceAlt,
        onTertiaryContainer = text,
        background = bg,
        onBackground = text,
        surface = surface,
        onSurface = text,
        surfaceVariant = surfaceAlt,
        onSurfaceVariant = textMuted,
        surfaceTint = surface,
        inverseSurface = text,
        inverseOnSurface = bg,
        error = error,
        onError = onError,
        errorContainer = surfaceAlt,
        onErrorContainer = text,
        outline = borderStrong,
        outlineVariant = border,
        scrim = Color.Black,
        surfaceBright = surface,
        surfaceDim = surfaceAlt,
        surfaceContainerLowest = surface,
        surfaceContainerLow = surface,
        surfaceContainer = surface,
        surfaceContainerHigh = surface,
        surfaceContainerHighest = surfaceAlt,
        primaryFixed = surfaceAlt,
        primaryFixedDim = surfaceAlt,
        onPrimaryFixed = text,
        onPrimaryFixedVariant = textMuted,
        secondaryFixed = surfaceAlt,
        secondaryFixedDim = surfaceAlt,
        onSecondaryFixed = text,
        onSecondaryFixedVariant = textMuted,
        tertiaryFixed = surfaceAlt,
        tertiaryFixedDim = surfaceAlt,
        onTertiaryFixed = text,
        onTertiaryFixedVariant = textMuted,
    )
}

@Composable
${signature} {
    val colors = ${colorsExpr}
    CompositionLocalProvider(
        LocalAppColors provides colors,
        LocalAppTypography provides AppType,
        LocalAppShapes provides AppShapeTokens,
    ) {
        MaterialTheme(
            colorScheme = colors.toColorScheme(inverseAccent = ${inverseExpr}),
            typography = AppMaterialTypography,
            shapes = AppMaterialShapes,
            content = content,
        )
    }
}

/** Accessors for the direction tokens: AppTheme.colors.accent, AppTheme.type.body, ... */
object AppTheme {
    val colors: AppColors
        @Composable @ReadOnlyComposable
        get() = LocalAppColors.current

    val type: AppTypography
        @Composable @ReadOnlyComposable
        get() = LocalAppTypography.current

    val shapes: AppShapes
        @Composable @ReadOnlyComposable
        get() = LocalAppShapes.current

    val spacing: Spacing get() = Spacing
}
`;
}

export const composeAdapter: Adapter = (d, o) => {
  const pkg = `${o.packageName}.ui.theme`;
  const dir = `app/src/main/java/${pkgPath(pkg)}`;
  const files: GeneratedFile[] = [
    { path: `${dir}/Color.kt`, content: colorKt(d, o, pkg) },
    { path: `${dir}/Type.kt`, content: typeKt(d, o, pkg) },
    { path: `${dir}/Shape.kt`, content: shapeKt(d, pkg) },
    { path: `${dir}/Spacing.kt`, content: spacingKt(d, pkg) },
    { path: `${dir}/Theme.kt`, content: themeKt(d, o, pkg) },
  ];

  const next: string[] = [
    'Add to app/build.gradle.kts dependencies: implementation(platform("androidx.compose:compose-bom:2026.09.00")), implementation("androidx.compose.material3:material3") (Material 3 1.4 or newer) and implementation("androidx.compose.ui:ui"). This BOM needs compileSdk 37 or newer (targetSdk can stay lower).',
  ];
  if (o.fontSource === 'google-fonts') {
    files.push({ path: 'app/src/main/res/values-v23/font_certs.xml', content: FONT_CERTS_XML });
    next.push(
      'Add implementation("androidx.compose.ui:ui-text-google-fonts") for Downloadable Fonts. Fonts load from Google Play services at runtime; until they arrive (or on devices without Play services) text renders in the system font.',
    );
  } else {
    const fontFiles = bundledFontFiles(d);
    next.push(
      `Add these font files to app/src/main/res/font/ (static TTF instances, open license): ${fontFiles.map((f) => f.file).join(', ')}. Get them from each family's Google Fonts page ("Get font" > download, use the files in the static/ folder) and rename them to exactly these lowercase names.`,
      `Ship each font's license with the app: ${families(d)
        .map((f) => `${f.family.name} (${f.family.license})`)
        .filter((v, i, a) => a.indexOf(v) === i)
        .join(', ')}.`,
    );
  }
  next.push(
    'Wrap your UI: setContent { AppTheme { ... } }. Call enableEdgeToEdge() before setContent and handle insets with Scaffold or WindowInsets.',
    'In screens use only AppTheme.colors, AppTheme.type, AppTheme.shapes and Spacing (for example Modifier.padding(Spacing.s4)). Never write Color(0x...), N.sp or N.dp literals in screen code.',
    `Set the Activity window background to the direction bg (${d.color.light.bg} light, ${d.color.dark.bg} dark) in res/values/themes.xml to avoid a white flash on launch.`,
  );
  return { files, next_steps: next };
};
