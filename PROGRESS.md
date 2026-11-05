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
