# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/). Changes to direction files that alter
generated output are always listed.

## [Unreleased]

### Added

- Repository bootstrap: TypeScript (ESM), Biome, Vitest, CI, contributor docs.
- Design direction schema (zod) with generated JSON Schema; WCAG contrast math.
- `fintech-trust` direction (light and dark).
- MCP tools: `get_design_direction`, `list_directions`, `check_contrast`, `get_anti_patterns`.
- MCP resources `direction://<id>` and `rules://anti-patterns`; prompt `design_kickoff`.
- `get_theme_code` adapters: Jetpack Compose, Android XML (Material Components 1.14), HTML, Tailwind v4, React, Next.js (App and Pages Router).
- `review_ui` static reviewer with common, web, Tailwind, Next.js, Compose and XML rules.
- `get_layout_blueprint` (landing, app, game, dashboard, e-commerce) and `get_review_rubric`.
- `premium-ui` Agent Skill and a direction preview page generator (`npm run preview`).
