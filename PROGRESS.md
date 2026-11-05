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
