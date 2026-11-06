# Progress log

Milestone-by-milestone record of the build (see SPEC.md section 14).

## M0: Repo bootstrap (done)

- TypeScript 7.0 (ESM, `nodenext`), Node `>=22`, Biome 2.6 (lint + format), Vitest 5.1.
- MCP SDK: **v2** `@modelcontextprotocol/server` 2.4 (the current stable line; v1
  `@modelcontextprotocol/sdk` is superseded). Entry uses `serveStdio(factory)`, which
  also serves 2025-era clients (`legacy: 'serve'` default). Verified against
  ts.sdk.modelcontextprotocol.io/v2 docs.
- Moved spec to `SPEC.md` (exact byte-for-byte rename). Added CONTRIBUTING,
  CODE_OF_CONDUCT (references Contributor Covenant 2.1), CHANGELOG, `.gitattributes`.
- `.gitignore`: appended an Android/Gradle block only (`.gradle/`, `build/`,
  `local.properties`, `.idea/`, `*.iml`, `.kotlin/`, `captures/`, `*.tmp.png`). Existing
  lines untouched. README.md and LICENSE untouched (Biome is configured to skip `*.md`).
- Tests: repo invariants (version sync, package fields, **no network imports in src/**,
  **no stdout writes in src/**), server factory smoke test.
- CI: `.github/workflows/ci.yml`, Node 22/24/26 matrix: lint, typecheck, test, build,
  package-size check (`scripts/check-pack-size.mjs`).
- Results: 5/5 tests pass; lint, typecheck, build pass; verified on a clean clone
  (`npm ci && npm test && npm run build`).
- Not verified: CI on GitHub is not green-checked because nothing is pushed (per instructions).

## M1: Schema, contrast math, first direction (done)

- `src/schema/direction.schema.ts`: zod 4 schema (source of truth). JSON Schema generated
  with zod's built-in `z.toJSONSchema` into `src/schema/direction.schema.json` (committed;
  a test fails if it is stale; regenerate with `npm run gen:schema`).
- Schema additions beyond the SPEC example, all needed by adapters or the agreed contrast rules:
  - `border_strong`: control outlines, 3:1 on bg and surface. `border` stays decorative.
  - Optional `link`: when set, accent only needs 3:1 and link needs 4.5:1.
  - Fonts get `weights`, plus an SPDX-style `license` enum (`OFL-1.1`, `Apache-2.0`, `UFL-1.0`, `MIT`).
  - Optional per-role `family`, plus `numerals`.
  - Elevation levels get `elevation_dp` and `shadow_dark`.
  - Optional `permits` flags (gradients, blur, shadows_on_cards) for the review rules.
- `src/a11y/contrast.ts` + `color.ts`: WCAG 2.x ratio, large-text rule, and a nearest-passing
  suggestion that keeps the hue (OKLCH lightness search, gamut-clamped, deterministic).
- `src/directions/validate.ts`: contrast pairs exactly as agreed. text and text_muted must
  pass on bg, surface and surface_alt. on_accent must pass on accent. accent, link,
  border_strong and the semantic colors must pass on bg and surface. Validation also checks
  the font weights the scale uses, the 7-size limit, the spacing grid, radius and motion
  ordering, a flat first elevation level, and that dark is not a copy of light.
- `src/directions/index.ts`: loader validates at first load and throws a readable error.
- `fintech-trust` authored (light and dark designed separately). All 34 contrast pairs pass,
  and the lowest ratio is border_strong at 3.19:1. **Needs your visual review (M9 preview page).**
- Results: 31/31 tests pass; lint, typecheck pass.

## M2: MCP server skeleton and read-only tools (done)

- `serveStdio` entry point. Tools are registered in `createServer()` (one file per tool in `src/tools/`):
  - `get_design_direction`: brief matching in `src/brief/match.ts`. Weighted scoring on
    best_for, mood, surface and avoid_for. A small stemmer plus a synonym table, no NLP deps.
    Returns `needs_clarification` with at most 4 questions when there is no positive signal, so it
    never guesses. Tie-break is by id, so output is deterministic.
  - `list_directions` (tag filter), `check_contrast` (AA/AAA flags plus hue-preserving suggestions),
    `get_anti_patterns` (16 entries with platform-specific tells).
- Resources: `direction://{id}` (listable template) and `rules://anti-patterns`. Prompt: `design_kickoff`.
- Tests: matching unit tests; every tool, resource and prompt through an in-memory MCP client;
  an end-to-end stdio test that spawns `dist/index.js` with the real SDK client and checks that
  every stdout line is JSON-RPC. CI now builds before testing so the stdio test always runs there.
- Manually verified with the official MCP Inspector CLI (`tools/call get_design_direction`).
- Results: 53/53 tests pass; lint, typecheck, build pass.
- Uncertain: matching quality can only really be judged once more directions exist (M9).
  With one direction, alternates are always empty.
- Not done: registering the server in your Claude Code config (`claude mcp add`). That changes
  your user settings, so I left it for you.

## M3: Compose adapter (done)

- New tool `get_theme_code`. It takes `platform` as one id or an array, plus `mode`, `language`, `router`,
  `package_name`, and `font_source` (`self-hosted` default, `google-fonts` opt-in, as agreed).
  `src/adapters/model.ts` holds the shared derived values (palette resolution, on-colors for semantic
  fills, type roles, spacing names, font file naming), so every adapter agrees.
- `compose` adapter (`src/adapters/android/compose.ts`) generates Color.kt, Type.kt, Shape.kt,
  Spacing.kt and Theme.kt:
  - `AppColors`, `AppTypography` (the 7 roles), `AppShapes` and `Spacing` (`s4` = 4 × base), exposed
    through `AppTheme.colors/type/shapes/spacing`.
  - Every Material 3 color role is mapped, including the 1.4 "fixed" roles. I found those by
    inspecting the compiled `ColorScheme` class, so stock components never show baseline purple.
  - The 7 roles are mapped onto the 15 M3 typography slots without inventing new sizes.
  - Fonts: bundled `res/font` files by default. With `google-fonts`, it generates Downloadable Fonts
    code plus `font_certs.xml`, copied verbatim from the official Android samples (Apache-2.0).
- Sample `examples/compose-sample/`: AGP 9.5.0 (built-in Kotlin), Kotlin/Compose plugin 2.4.21,
  Compose BOM 2026.09.00 (Material 3 1.4.0), Gradle 9.7.1 wrapper with a pinned SHA-256, compileSdk 37.
  Two product flavors compile both font strategies. The theme files are generated, and a vitest
  `toMatchFileSnapshot` test keeps them identical to the adapter output (`npm run gen:samples`).
  The demo screen is a banking home that uses only tokens.
  - Fonts: static OFL TTFs for Fraunces, Manrope and JetBrains Mono from the Google Fonts API, with
    OFL texts from google/fonts. They live in examples/ only and are not in the npm package.
- **Compile check: `./gradlew :app:assembleDebug` succeeds locally for both flavors.** A CI job
  `compose-sample` was added (temurin 21 + setup-android). It is not run yet because nothing is pushed.
- Findings:
  - Compose BOM 2026.09 requires compileSdk 37. The next_steps now say so.
  - Local-only environment quirk: Gradle failed with "Unable to establish loopback connection"
    from the JDK's AF_UNIX selector. It was fixed by running with
    `JAVA_TOOL_OPTIONS=-Djdk.net.unixdomain.tmpdir=C:\Windows\Temp`.
    This does not affect CI or users. The build also had to run outside the tool sandbox.
- Results: 69/69 tests pass (including snapshots); lint and typecheck pass.

## M4: Web core, html + tailwind (done)

- `src/adapters/web/tokens.ts` is the single token generator for the web family. CSS variables
  use **Tailwind v4 namespace names** (`--color-*`, `--font-*`, `--text-*` with `--line-height` /
  `--letter-spacing` / `--font-weight` companions, `--spacing-N`, `--radius-*`, `--shadow-*`,
  `--ease-*`), so plain CSS and Tailwind share one `tokens.css`. Fluid `clamp()` sizes come from
  `web_responsive` (min at 360px, max at 1280px). Dark mode is set by `<html data-theme>`, with
  `prefers-color-scheme` as the no-JS fallback.
- `html` adapter: tokens.css, fonts.css (self-hosted woff2, `font-display: swap`), base.css
  (reset, role classes `.t-*`, focus-visible, reduced motion, token-only components),
  theme.js (toggle, localStorage, follows the system when there is no choice, keeps `aria-pressed`
  in sync), and index.html. The page follows the landing blueprint with copy guidance, uses no
  inline styles, and puts the no-flash snippet first in `<head>`. The Google Fonts `<link>` is
  only emitted with `font_source: "google-fonts"`.
- `tailwind` adapter (v4.3, CSS-first `@theme`) resets the color, font, text, spacing, radius,
  shadow, ease and blur namespaces, so only direction tokens exist. The default palette,
  off-grid spacing and blur never compile. It adds `@custom-variant dark` on `data-theme`,
  `@utility t-<role>` shortcuts, and `min-h-touch` / `size-touch` (44px).
- Verified empirically with the real Tailwind 4.3.4 CLI rather than only the docs. Explicit
  `--spacing-*` values after `--spacing-*: initial` work, and `p-5` is not generated.
  **Limitation found:** arbitrary values (`text-[17px]`, `bg-[#...]`) and gradient direction
  utilities still compile in Tailwind. No theme config can block them, so `review_ui` (M7)
  must flag them.
- Samples:
  - `examples/web-sample/` (plain HTML) and `examples/tailwind-sample/` (HTML + Tailwind).
    Both are kept in sync with the generator by file snapshots. Latin woff2 subsets and OFL
    texts are included.
  - The Tailwind sample has `npm run check`. It builds with the CLI, asserts which utilities
    exist and which don't, and parses every generated stylesheet with Lightning CSS (strict).
    It passes locally, and a CI job `web-samples` was added.
- Rendered in the browser pane from a local static server:
  - Light and dark show the correct palette and the self-hosted fonts load.
  - The theme is set before the stylesheets (no flash), and the toggle works.
  - The render caught a real bug: `padding` shorthand in `.section` and `.hero` wiped out the
    container's side padding. Fixed, and now all content starts at the same edge.
- Results: 85/85 tests pass; lint and typecheck pass.

## M5: React and Next.js (done)

- `react` adapter (TS or JS, no component library):
  - `src/theme/` gets tokens.css, fonts.css and base.css (or a Tailwind `src/index.css` when combined).
  - `tokens.ts` holds CSS-variable references for inline styles and CSS-in-JS, raw palettes for
    canvas and charts, and `NO_FLASH_SCRIPT`.
  - `theme.tsx` has `useTheme()` via `useSyncExternalStore` (reads `<html data-theme>`, with a
    null server snapshot, so hydration never mismatches), plus a `ThemeProvider` that follows
    system changes until the user chooses.
  - `ThemeToggle.tsx` and `useReducedMotion.ts`. next_steps cover plain CSS, CSS Modules and Tailwind.
- `nextjs` adapter (Next.js 16, verified against current docs):
  - App Router: `app/globals.css`, `app/tokens.css`, `app/fonts.ts` and `app/layout.tsx`.
    The layout has the `viewport` export for themeColor and colorScheme, `fontVariables` on
    `<html>`, an inline no-flash `<script>` in `<head>`, and `suppressHydrationWarning` on
    `<html>` only. Theme modules live in `components/theme/`, and only theme and toggle are
    `'use client'`. The script constant lives in a server-safe module, because a string
    exported from a client module would arrive as a client reference.
  - Fonts: `next/font/local` by default (self-hosted woff2). `next/font/google` is opt-in; it
    also self-hosts at build time. tokens.css font stacks reference the `--nf-*` variables
    from next/font.
  - Pages Router: `pages/_document` (meta and script), `pages/_app` (global CSS, `<style jsx global>`
    for the font variables) and `styles/`.
  - With Tailwind: `postcss.config.mjs` plus the Tailwind entry in globals.css.
- Samples:
  - `examples/react-sample` (Vite 8.3, React 19.3, TS 7 typecheck): `npm run build` passes.
  - `examples/nextjs-sample` (Next 16.4.5 + Tailwind 4.3.4, App Router and a Pages Router route
    in one app): `next build` passes, including type checking. It uses TypeScript 5.9 because
    that is what create-next-app pins; TS 7 was not tried with Next.
  - Both are kept in sync with the generators by file snapshots.
- Browser-verified in `next dev`, which is the mode that reports hydration errors. With a stored
  dark theme there were **no hydration warnings**. Dark palette, next/font families and toggle
  state were correct on `/` (App Router) and `/legacy` (Pages Router), and the Pages Router
  font variables resolve on `:root`.
- JS variants: snapshot-tested, plus a syntax parse of every generated .js/.jsx with the
  TypeScript compiler (in a test). Only the TS variants are built in sample apps.
- CI job `react-next-samples` added.
- Results: 99/99 tests pass; lint and typecheck pass.

## M6: Android XML (done; on-device visual check not done)

- `android-xml` adapter for Material Components 1.14.0 (Material 3). All attribute and style
  names were verified against the library's own `R.txt`, not from memory. It generates:
  - `values/colors.xml` and `values-night/colors.xml`: separately designed palettes, plus
    `ds_accent_inverse` and `ds_light_system_bars`.
  - `values/themes.xml`: `Theme.App` (DayNight, Light or Dark parent depending on mode). Every
    M3 color role is mapped, including the fixed and surface-container roles. All 30 M3
    text-appearance attributes (including the new *Emphasized* ones) point at the 7 roles, and
    shape appearances and window/system-bar colors are set. It also has widget styles for
    MaterialButton (primary and outlined), MaterialCardView (hairline border, no elevation) and
    TextInputLayout (outlined).
  - `values/type.xml`: `TextAppearance.App.*` in sp, with lineHeight, letterSpacing and
    `tnum`; each weight is a separate font resource, so it works on every API level.
  - `values/dimens.xml` (spacing, radii, elevation, 48dp touch target), `values/shapes.xml`,
    and `ds_bg_*` shape/ripple drawables for plain views.
  - Fonts: bundled `res/font` TTFs by default. With `google-fonts`: provider font XML per
    weight, `font_certs.xml`, `preloaded_fonts` and the manifest meta-data step.
- Sample `examples/android-xml-sample/`: AppCompatActivity with a Views layout that uses only
  theme attributes and `ds_*` resources, plus bundled and downloadable flavors.
  **`./gradlew :app:assembleDebug` succeeds locally for both flavors** (AAPT2 resolves every
  attribute and parent). CI job `android-xml-sample` added.
- **Not done:** viewing light and dark on a device. When I tried to boot an emulator, another
  emulator instance was already running on your machine (likely yours). I did not install
  anything on it or start a second instance. To check by hand, run
  `./gradlew :app:installBundledDebug` in that folder and toggle dark theme on the device.
- Results: 108/108 tests pass; lint and typecheck pass.

## M7: `review_ui` for all shipped platforms (done)

- Architecture (`src/review/`):
  - Platform scanners extract normalized facts. `scan/css.ts` covers stylesheets, HTML
    `<style>`, `style=""`, JSX style objects and CSS-in-JS. `scan/tailwind.ts` reads class
    lists, `scan/web.ts` handles HTML/JS/JSX, and `scan/android.ts` handles Kotlin and XML.
  - 17 common rules run on those facts, so every platform is checked the same way
    (`rules/common.ts`). About 25 platform rules sit on top (`rules/platform.ts`).
  - Comments are blanked with line numbers preserved. Generated token files are exempt from
    the "hardcoded" rules, and minified build output is skipped.
  - The engine de-duplicates, caps findings at 8 per rule per file (noting the overflow), and
    caps the score cost per rule. It only suppresses an info finding when a stronger finding
    on the same line says the same thing.
  - `review_ui` returns `{ score, findings: [{ rule, severity, file, line, message, fix }], summary }`.
  - Every rule is documented in `docs/review-rules.md`, and a test fails if any emitted id
    is missing from it.
- Fixtures:
  - `fixtures/bad-<platform>/` for all 6 platforms. Each `expected.json` lists 14 to 26 rules
    that must fire, and every one does.
  - `fixtures/good-<platform>/` produces **zero findings of any severity**.
- False-positive review: 30 hand-written realistic snippets (5 per platform) in
  `fixtures/realistic/`, plus all six sample apps. **Zero findings on all of them**, and both
  are now tests. Problems found and fixed along the way:
  1. Next.js layouts using `dangerouslySetInnerHTML={{ __html: NO_FLASH_SCRIPT }}` were not
     recognized as a pre-paint theme script.
  2. `layout_width="0dp"` (weight / constraints) was counted as a tiny touch target.
  3. Minified Tailwind `output.css` was treated as source.
  4. Short hex-looking strings such as `'#add'` (hash routes) were treated as colors.
  5. `Icon(Modifier.size(24.dp))` inside an `IconButton` was flagged as a touch target.
  6. `©`, `™` and arrows matched `Extended_Pictographic` and were flagged as emoji. The emoji
     check now uses `Emoji_Presentation` or VS16.
  7. Icon-button detection broke on `=>` inside JSX attributes.
- Tuning: the `uniform-pill-everything` threshold went from 75% to 60% of radii; real
  pill-heavy UIs still mix in a few small radii.
- Known limits: heuristics, not a parser. Rules work per file or project-wide, not per
  rendered element, so text/background contrast is only checked when both colors are set in
  the same rule block, style object or class list.
- Results: 140/140 tests pass; lint and typecheck pass.

## M8: Blueprints and rubric (done)

- `src/schema/blueprint.schema.ts` (zod, with a generated and committed
  `blueprint.schema.json`) and five validated blueprint files in `src/blueprints/`: landing
  page (sections in the SPEC order, with copy-length limits), mobile app (navigation pattern,
  48dp targets, safe areas, thumb zone, six states), game UI (HUD, 64dp controls, readability
  over busy scenes, reward moments), dashboard, and e-commerce.
- `get_layout_blueprint(surface, direction_id)` returns the ordered sections, principles,
  states, accessibility and avoid list, merged with the direction's component rules and
  signature details. It accepts surface aliases (`landing-page`, `store`, `mobile-app`, ...).
- `get_review_rubric(direction_id?)` returns 12 weighted criteria with pass and fail signals,
  scoring instructions (0-2 × weight, re-check below 70%), and direction-specific
  present/absent checks. The server does not analyze images.
- Results: 153/153 tests pass; lint and typecheck pass. The package is 89.8 KB packed.

## M9 (partial, as instructed): Skill and fintech-trust preview. **Stopped for your visual review.**

- `skills/premium-ui/SKILL.md`, checked against the Agent Skills spec and the Claude Code skills docs:
  - `name` matches the folder. `description` is 200 characters or fewer (claude.ai uploads may
    cap at 200; the spec allows 1024). Extra trigger phrases go in `when_to_use`, which only
    Claude Code reads.
  - The body is about 90 lines, with long material in `references/` (`principles.md`,
    `anti-patterns.md`, `platforms.md`).
  - It covers the brief-first rule (at most 4 questions), a stack detection table, theme files
    before screens, the blueprint, tokens only, `review_ui` until clean, the screenshot rubric,
    and switching to an alternate direction when one is rejected.
  - The Skill refers to tools by bare name rather than `mcp__...`, because the full name
    depends on how the server is installed (plugin or plain).
- `tests/skill.test.ts` checks the frontmatter, body length, that every referenced file exists,
  and that every tool named in the Skill is registered on the server.
- Preview page: `npm run preview -- fintech-trust` writes `examples/previews/fintech-trust.html`
  (self-contained, with self-hosted fonts). It shows light and dark side by side: balance hero,
  primary/secondary/text buttons, plain and interactive cards, activity list, input with an
  error state, status badges, palette swatches with contrast, the type scale, spacing, radii,
  elevation, a review checklist and the full WCAG table. It is generated from the direction
  data, so it works for every future direction. A screenshot is saved at
  `examples/previews/fintech-trust.jpg`.
- Verified in the browser pane at 1400px: all five font files load, there is no horizontal
  overflow, and both themes render.
- **Open question for your review:** success green (#1F7A3D light / #6BCB86 dark) is close in
  hue to the accent green (#0F6B4F / #5CC49B). It passes contrast, but may blur "primary action"
  versus "positive amount". Options: keep it; move success toward a yellower green; or switch
  the accent to a muted ink-blue.
- Not done (by instruction): the other 5 to 7 directions, and their previews.
- Results: 157/157 tests pass; lint and typecheck pass. The package is 95.4 KB packed
  (the Skill is now included).
- This branch (`m9-skill-preview`) is committed but **not merged into main**, because M9 is
  incomplete until you approve the direction.

### M9 follow-up: success-green options on the preview page

- Added `--compare` mode to the preview generator (`npm run preview:compare`). It reads
  `examples/previews/variants/fintech-trust.json`, applies each option's color overrides to a copy
  of the direction, **validates it against the same WCAG rules as shipped directions** (it refuses
  to render an invalid option), and writes `examples/previews/fintech-trust-compare.html`.
  The page shows a 2×2 grid (A and B, each in light and dark) plus a table with hue gap and
  contrast numbers, with the current palette for reference.
- Option A (yellower success): success #4F7312 light / #AFCB6E dark. Hue gap to the accent
  16° → 37° (light), 14° → 42° (dark).
- Option B (ink-blue accent, green only for success): accent #2E4A6B light / #93AFD3 dark,
  on_accent #FFFFFF / #0D1726. Hue gap 103° (light), 104° (dark). Accent contrast on bg
  8.41:1 / 8.26:1.
- Neither option is applied to `src/directions/fintech-trust.json` yet; the shipped direction is
  unchanged until you choose.
