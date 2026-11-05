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
