# Contributing

Thanks for helping make AI-built interfaces look better. This project is small on
purpose: a few excellent design directions, thin platform adapters and a precise
reviewer. Please read [SPEC.md](SPEC.md) before larger changes.

## Setup

Requires Node.js 22 or newer.

```bash
npm install
npm test          # unit, snapshot and data-validation tests
npm run lint      # Biome lint + format check
npm run typecheck
npm run build     # emits dist/
```

Run the server from a clone with `node dist/index.js` (it speaks MCP over stdio,
so it will wait silently for a client). To poke at it interactively:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Ground rules

- **No network, no telemetry, no paid services.** The server never makes network
  calls. A test fails if a network library is imported under `src/`.
- **stdout is the protocol channel.** Log to stderr only.
- **Deterministic output.** Same input, same bytes out. Snapshot tests enforce it.
- **No `any`** without a comment explaining why.
- **No brand cloning.** Directions express principles in original palettes and
  type pairings. No third-party logos, trademarks, exact brand palettes or
  proprietary fonts.
- **Open-licensed fonts only** (OFL or equivalent), with license and source
  recorded in the direction file.

## Contributing a design direction

1. Copy an existing file in `src/directions/` and give it a new `id`.
2. Design the light and dark palettes separately (no auto-inversion).
3. Run `npm test`: the schema, WCAG AA contrast and font-license checks must pass.
4. Generate the preview page and attach light and dark screenshots to your PR.
   Every direction is reviewed visually by a human before it ships.

## Contributing a platform adapter

An adapter is one file under `src/adapters/<family>/`, one set of review rules
under `src/review/rules/<platform>/`, and one fixture set
(`fixtures/bad-<platform>/`, `fixtures/good-<platform>/`). Verify any framework
specifics against that framework's current official documentation and note the
targeted version in the adapter header.

## Commits and pull requests

Keep commits small with clear messages. Fill in the PR template, including test
results and screenshots for anything visual.
