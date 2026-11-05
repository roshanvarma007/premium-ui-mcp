# Premium UI MCP: Project Specification

> Working name: `premium-ui-mcp` (rename freely; check npm and GitHub availability before committing to a name).
> This document is the single source of truth for Claude Code. Read it fully before writing any code. Build in the milestone order given in section 14. Do not skip ahead.

---

## 1. One-line pitch

An open-source MCP server plus Claude Skill that stops AI-generated apps and websites from looking like "AI slop" (glossy gradients, glassmorphism, navy blue, default Material purple, emoji icons) and instead gives them a premium, market-quality design that fits the product type, the audience and the platform.

## 2. The problem

When people ask an AI to build an Android app or a website, the result almost always shares the same look:

- Navy / dark blue + cyan or purple gradients
- Glassmorphism, blur, glow shadows
- Default Material purple, Inter or Roboto everywhere
- Every card has a shadow, every corner is very round
- Emoji used as icons
- Random font sizes and spacing that follow no system
- The same look for a bank, a kids' game and a luxury brand

The model has no concrete design system to follow, so it falls back to its defaults. The fix is to give it **decided, opinionated, context-aware design directions and hard rules**, so it never has to guess.

## 3. Product vision

The user installs the tool locally in Claude (Claude Code, Claude Desktop, any MCP client). From then on, when they ask Claude to build a UI, Claude:

1. Understands the product context (what is being built, for whom, what feeling, which platform).
2. Picks a complete **design direction** (colors, typography, spacing, radius, elevation, motion, layout blueprint).
3. Generates platform-correct theme code from that direction.
4. Reviews its own UI code against machine-checkable rules and fixes violations.

The output should feel like it was made by a senior product designer and engineer at a top-tier company.

## 4. Goals and non-goals

### Goals
- Completely free to use and to run. No backend, no hosted service, no paid API inside the tool.
- Runs locally via `npx` (or `uvx` if a Python build is chosen; this spec assumes TypeScript/Node).
- Works with Claude Code and Claude Desktop first; any MCP-compatible client should work.
- Platform-independent design data with small per-platform adapters.
- Deterministic, testable behavior. The tool supplies rules, data and checks; the user's own Claude does the reasoning.
- A small number of directions that are genuinely excellent, rather than many average ones.

### Non-goals
- No LLM or paid API calls inside the server.
- No image generation, no screenshot analysis inside the server (Claude can look at screenshots itself; the server only provides a rubric).
- No copying of any real brand's assets, logos, exact palettes or proprietary fonts. Learn principles, do not clone.
- No cloud accounts, telemetry or analytics. Nothing leaves the user's machine.

## 5. Platforms and framework coverage

Platforms are grouped into two families. Inside a family, adapters share one token pipeline, so adding a framework is a thin layer, not a rewrite.

### 5.1 Platform ids

**Web family** (all built on one shared CSS-variable token output)

| Platform id | Covers |
|---|---|
| `html` | Plain HTML + CSS + vanilla JavaScript (static sites, landing pages) |
| `tailwind` | Tailwind configuration mapped to the CSS variables; used together with `html`, `react` or `nextjs` |
| `react` | React in JavaScript or TypeScript (Vite-style and other React setups) |
| `nextjs` | Next.js, App Router first, with Pages Router notes |

**Android family**

| Platform id | Covers |
|---|---|
| `compose` | Jetpack Compose (Kotlin) |
| `android-xml` | Android Views with XML layouts and resources |

**Later**: `flutter`, `react-native`, `swiftui`.

### 5.2 What each platform adapter must generate

All adapters read the same direction JSON. Units: Android text in `sp`, Android spacing/radius in `dp`, web sizes in `rem` (base 16px) with `clamp()` for responsive display sizes.

- **`html`**: `tokens.css` (CSS custom properties; light/dark via `prefers-color-scheme` plus a `data-theme` attribute override), `base.css` (modern reset, typography role classes such as `.t-display`, `.t-body`, focus-visible styles, reduced-motion handling), `theme.js` (vanilla JavaScript theme toggle persisted in `localStorage`, plus a tiny inline snippet that sets `data-theme` before first paint to avoid a flash), font-loading snippet (`<link>` with preconnect, or self-hosting instructions), and a starter `index.html` that follows the landing-page blueprint.
- **`tailwind`**: config that maps theme colors, font families, font-size scale (with line-height and letter-spacing), spacing scale and radii to the CSS variables, so dark mode needs no duplicated classes. Tailwind's configuration style differs between major versions (JS config vs CSS-first). Check the current Tailwind documentation first, then generate for the current major version and document which version is targeted.
- **`react`**: accepts `language: "ts" | "js"`. Generates `theme/tokens.(ts|js)`, `theme/tokens.css`, an optional `ThemeProvider` plus `useTheme` hook, and a `useReducedMotion` hook. Must not depend on any component library. Include short guidance for CSS Modules, Tailwind and plain CSS usage.
- **`nextjs`**: accepts `router: "app" | "pages"` and `language: "ts" | "js"`. App Router output: `globals.css`, a `layout` snippet wiring fonts through Next.js's built-in font optimization, no-flash dark mode, and `themeColor` metadata. Keep tokens CSS-only so Server Components work without change; put the theme provider in a Client Component. Pages Router output: `_app` and `_document` equivalents. Verify all Next.js specifics against the current official docs before generating.
- **`compose`**: `Color.kt`, `Type.kt`, `Shape.kt`, `Spacing.kt`, `Theme.kt`, plus font resource setup (bundled fonts or downloadable fonts; document both).
- **`android-xml`**: `res/values/colors.xml` and `res/values-night/colors.xml`, `themes.xml` (and night variant), `type.xml` (TextAppearance styles per type role), `dimens.xml` (spacing and radius), `res/font/` font-family resources, and shape drawables for buttons and cards. Check the current Material Components documentation for correct parent theme names before generating.

### 5.3 Release plan

| Version | Platforms |
|---|---|
| v0.1 | Web family (`html`, `tailwind`, `react`, `nextjs`) and Android family (`compose`, `android-xml`) |
| v0.2 | Flutter, React Native |
| v0.3 | SwiftUI |

Scope guard: Android XML is the **last** v0.1 adapter milestone. If the schedule slips, it moves to v0.2 without blocking the v0.1 release. The web family is cheap because it shares one token generator.

The architecture must make adding a platform a small, well-documented task (one adapter file, one set of review rules, one fixture set). README must show a platform table with what is ready and what is on the roadmap.

---

## 6. Core architecture

**One design, many outputs.** Design directions are pure data (JSON). Adapters turn that data into platform code. Review rules are per-platform scanners.

```
premium-ui-mcp/
├── package.json
├── tsconfig.json
├── README.md
├── LICENSE                      # MIT
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── CHANGELOG.md
├── SPEC.md                      # this file (kept in repo)
├── src/
│   ├── index.ts                 # entry, stdio MCP server, bin target
│   ├── server.ts                # tool/resource/prompt registration
│   ├── schema/
│   │   ├── direction.schema.ts  # zod schema (source of truth)
│   │   └── direction.schema.json# generated JSON Schema for contributors
│   ├── directions/              # the design packs (JSON, hand-crafted)
│   │   ├── index.ts             # loader + validation
│   │   ├── fintech-trust.json
│   │   ├── luxury-editorial.json
│   │   ├── game-playful.json
│   │   ├── ...
│   ├── brief/
│   │   └── match.ts             # maps a structured brief to ranked directions
│   ├── adapters/
│   │   ├── types.ts
│   │   ├── web/
│   │   │   ├── tokens.ts        # shared CSS-variable token generation (single source for the web family)
│   │   │   ├── html.ts          # tokens.css, base.css, theme.js, starter index.html
│   │   │   ├── tailwind.ts      # tailwind config mapped to CSS variables
│   │   │   ├── react.ts         # theme files for React (JS or TS)
│   │   │   └── nextjs.ts        # globals.css, font setup, layout wiring (App Router, Pages Router notes)
│   │   ├── android/
│   │   │   ├── compose.ts       # Color.kt, Type.kt, Theme.kt, Shape.kt, Spacing.kt
│   │   │   └── xml.ts           # colors.xml, themes.xml, type.xml, dimens.xml, font resources
│   │   └── ...                  # flutter, react-native, swiftui later
│   ├── review/
│   │   ├── types.ts             # Finding, Severity, Rule
│   │   ├── engine.ts            # runs rules on supplied files
│   │   ├── rules/
│   │   │   ├── common/          # contrast, color-count, font-size-count, spacing-grid
│   │   │   ├── compose/         # kotlin scanners
│   │   │   ├── android-xml/     # layout + resource xml scanners
│   │   │   ├── web-core/        # css, html, inline styles, vanilla js
│   │   │   ├── tailwind/        # class-based scanners
│   │   │   ├── react/           # jsx/tsx scanners
│   │   │   └── nextjs/          # framework-specific checks
│   ├── blueprints/              # layout guidance per surface type
│   │   ├── landing-page.json
│   │   ├── mobile-app.json
│   │   ├── game-ui.json
│   │   ├── dashboard.json
│   │   └── ecommerce.json
│   ├── a11y/
│   │   └── contrast.ts          # WCAG contrast math
│   └── tools/                   # one file per MCP tool
├── skills/
│   └── premium-ui/
│       ├── SKILL.md
│       └── references/          # anti-patterns, typography, color, motion notes
├── fixtures/
│   ├── bad-<platform>/          # deliberately "AI-looking" code, one folder per platform id
│   └── good-<platform>/         # clean code that must produce zero findings
├── tests/
├── examples/
│   └── before-after/            # same prompt, with and without the tool
└── .github/
    ├── workflows/ci.yml
    ├── ISSUE_TEMPLATE/
    └── PULL_REQUEST_TEMPLATE.md
```

Implementation notes for Claude Code:
- Use TypeScript, ESM, Node LTS. Check the **current** official MCP TypeScript SDK documentation before writing server code, since APIs and package names change between versions. Do not rely on memory for SDK signatures.
- Use stdio transport. The server must start fast and never write non-protocol output to stdout (log to stderr only).
- Validate every direction file with the zod schema at load time and in CI.
- Keep runtime dependencies minimal. Prefer writing small token transforms by hand over pulling in heavy build tooling; evaluate Style Dictionary only if it clearly reduces code without bloating install size.
- Provide a `bin` entry so `npx -y premium-ui-mcp` works.

## 7. Design direction schema

A direction is a complete, self-contained design decision. Every field is required unless marked optional. The zod schema in `direction.schema.ts` is the source of truth; the JSON below shows the shape.

```json
{
  "id": "fintech-trust",
  "name": "Fintech Trust",
  "version": 1,
  "summary": "Calm, credible, precise. Warm neutral surfaces, ink text, one restrained green accent.",
  "best_for": ["banking", "payments", "investing", "insurance", "accounting"],
  "avoid_for": ["kids games", "nightlife", "streetwear"],
  "mood": ["trustworthy", "calm", "precise"],
  "color": {
    "light": {
      "bg": "#F7F6F3", "surface": "#FFFFFF", "surface_alt": "#F0EEE9",
      "text": "#16181D", "text_muted": "#6B6F76", "border": "#E4E1DA",
      "accent": "#0F6B4F", "on_accent": "#FFFFFF",
      "success": "#1B7F5A", "warning": "#A15C00", "error": "#B3261E"
    },
    "dark": { "...": "full parallel set, not an inversion of light" }
  },
  "typography": {
    "display_family": { "name": "Fraunces", "license": "OFL", "source": "google-fonts", "fallback": ["Georgia", "serif"] },
    "body_family":    { "name": "Manrope",  "license": "OFL", "source": "google-fonts", "fallback": ["system-ui", "sans-serif"] },
    "mono_family":    { "name": "JetBrains Mono", "license": "OFL", "source": "google-fonts", "fallback": ["monospace"] },
    "scale": {
      "display":   { "size": 40, "weight": 600, "line_height": 48, "letter_spacing": -0.02 },
      "headline":  { "size": 28, "weight": 600, "line_height": 36, "letter_spacing": -0.01 },
      "title":     { "size": 18, "weight": 600, "line_height": 24, "letter_spacing": 0 },
      "body":      { "size": 16, "weight": 400, "line_height": 24, "letter_spacing": 0 },
      "body_small":{ "size": 14, "weight": 400, "line_height": 20, "letter_spacing": 0 },
      "label":     { "size": 12, "weight": 500, "line_height": 16, "letter_spacing": 0.02 },
      "caption":   { "size": 12, "weight": 400, "line_height": 16, "letter_spacing": 0.01 }
    },
    "web_responsive": { "display": { "min": 32, "max": 64 }, "headline": { "min": 24, "max": 40 } }
  },
  "spacing": { "base": 4, "scale": [0, 4, 8, 12, 16, 24, 32, 48, 64, 96] },
  "radius":  { "sm": 6, "md": 12, "lg": 16, "full": 999, "usage": "Buttons md, cards md, sheets lg. Never mix more than 3 radii on one screen." },
  "elevation": { "style": "borders-first", "levels": [
    { "name": "none" }, { "name": "raised", "shadow": "0 1px 2px rgba(22,24,29,0.06)" }, { "name": "overlay", "shadow": "0 8px 24px rgba(22,24,29,0.12)" }
  ]},
  "motion": { "duration_ms": { "fast": 120, "base": 200, "slow": 320 }, "easing": "cubic-bezier(0.2, 0, 0, 1)", "rules": ["Animate opacity and transform only", "No bounce on financial data", "Respect reduced-motion"] },
  "iconography": { "style": "outline 1.5px, rounded caps", "recommended_sets": ["Lucide", "Material Symbols (outlined)"], "never": ["emoji as icons", "mixed icon styles"] },
  "components": {
    "button": "Primary solid accent, 48dp/44px min height, 12 radius, label weight 600. Secondary is outlined. Max one primary per view.",
    "card": "Surface color, 1px border, no shadow unless interactive.",
    "input": "Filled surface_alt or 1px border, visible label always, never placeholder-only labels.",
    "list": "Dividers via spacing and hairlines, not boxed rows."
  },
  "signature_details": ["Tabular numerals for all money values", "Hairline dividers", "Generous top-of-screen whitespace"],
  "avoid": ["gradients", "blur / glassmorphism", "glow shadows", "more than one accent color", "pure #000 on pure #FFF", "default Material purple"]
}
```

Rules for every shipped direction:
- Light and dark palettes are designed separately, not auto-inverted.
- Every text/background pair used by the scale passes WCAG AA (4.5:1 body, 3:1 large text and UI). CI must verify this.
- Exactly one accent color family. Semantic colors (success, warning, error) are separate and used only for meaning.
- Fonts must have an open license (OFL or equivalent). Record license and source in the file. CI fails on a missing license field.
- Include real fallbacks for every font.
- Every direction lists `best_for`, `avoid_for` and an explicit `avoid` list.

## 8. Directions to ship in v0.1

Hand-craft 6 to 8 directions, each fully polished. Quality beats quantity.

| id | Use case | Type mood | Color mood |
|---|---|---|---|
| `fintech-trust` | banking, payments, insurance | clear serious sans, optional serif display | warm neutral, ink, one muted green or blue |
| `luxury-editorial` | jewelry, fashion, hospitality, premium brands | high-contrast serif display + quiet sans | warm off-white, near-black, restrained metallic accent |
| `saas-clean` | B2B SaaS, productivity | neutral grotesque sans | near-monochrome, one sharp accent |
| `developer-tool` | dev tools, docs, CLIs | mono + neutral sans | almost monochrome, one electric accent |
| `wellness-calm` | health, meditation, journaling | soft sans or light serif | earthy, muted, low saturation |
| `game-playful` | casual and puzzle games | chunky rounded display font | dark or saturated base, bold accents, thick outlines |
| `commerce-bold` | e-commerce, marketplaces | strong grotesque | clean white with a confident accent, product imagery first |
| `utility-minimal` | tools: compass, notes, recorders, trackers | system-like clean sans | neutral, single accent, high legibility |

Each direction must be authored by studying real, successful products for principles (hierarchy, spacing rhythm, restraint) and then expressing those principles in original palettes and type pairings. Never reproduce a brand's exact colors, logos or assets. Never rely on an LLM to "generate" a direction and ship it unreviewed; every direction needs human review (screenshot it, look at it, adjust).

## 9. MCP tools

All tools are deterministic and offline. Input and output schemas are defined with zod. Responses are concise text plus structured JSON where useful. Tool descriptions must be written so a model knows exactly when to call each one.

### 9.1 `get_design_direction`
Pick the best direction for a brief.
- Input: `{ product_type: string, audience?: string, feelings?: string[], platform: "html" | "tailwind" | "react" | "nextjs" | "compose" | "android-xml", surface?: "landing" | "app" | "game" | "dashboard" | "ecommerce", constraints?: string[] }`
- Output: the top direction (full JSON) plus 1 to 2 alternates with one-line reasons, and a short "why this fits" note.
- Behavior: scoring in `brief/match.ts` using `best_for`, `avoid_for`, `mood` tags. Must be deterministic and unit tested. If the brief is too vague, return a `needs_clarification` list of questions (max 4) instead of guessing.

### 9.2 `list_directions`
- Input: `{ tag?: string }`
- Output: id, name, summary, best_for, mood for each direction.

### 9.3 `get_theme_code`
Generate platform code from a direction. Per-platform file lists and rules are defined in section 5.2.
- Input: `{ direction_id: string, platform: "html" | "tailwind" | "react" | "nextjs" | "compose" | "android-xml", mode?: "light" | "dark" | "both", language?: "ts" | "js", router?: "app" | "pages", package_name?: string }`
  - `language` applies to `react` and `nextjs`. `router` applies to `nextjs`. `package_name` applies to Android platforms.
  - `tailwind` can be requested on its own or combined with `html`, `react` or `nextjs` (accept an array of platform ids if simpler to implement).
- Output: a list of `{ path, content }` files ready to write into the project, plus a short `next_steps` list (for example "import globals.css in your root layout", "add fonts under res/font").
- Generated code must compile or lint cleanly. Add snapshot tests per platform. In CI, compile-check Kotlin and build the React and Next.js sample projects where feasible.

### 9.4 `get_layout_blueprint`
- Input: `{ surface: string, direction_id: string }`
- Output: ordered structure with guidance.
  - Landing page: hero, social proof, three feature blocks max, how it works, pricing, FAQ, final CTA, footer; copy-length guidance; one primary CTA; above-the-fold rules.
  - Mobile app: navigation pattern, minimum touch target (48dp), safe areas, empty/loading/error states, thumb-zone placement.
  - Game UI: HUD placement, button sizes, readability over busy backgrounds, reward and feedback moments.
  - Dashboard and e-commerce blueprints similarly.

### 9.5 `review_ui`
Static review of supplied code. See section 10.
- Input: `{ platform: string, files: [{ path: string, content: string }], direction_id?: string }`
- Output: `{ score: 0-100, findings: [{ rule, severity, file, line, message, fix }], summary }`
- Must not call any external service.

### 9.6 `check_contrast`
- Input: `{ foreground: string, background: string, text_size_px?: number, bold?: boolean }`
- Output: ratio, AA/AAA pass flags, nearest passing adjustment suggestion.

### 9.7 `get_anti_patterns`
- Input: `{ platform?: string }`
- Output: the "never do this" list with short reasons and what to do instead.

### 9.8 `get_review_rubric`
A checklist Claude applies to a screenshot it can see itself (hierarchy, spacing rhythm, alignment, contrast, density, one focal point per screen). The server does not analyze images.

### 9.9 MCP resources and prompts (optional but recommended)
- Resources: each direction exposed as `direction://<id>`, the anti-patterns list as `rules://anti-patterns`.
- Prompt: `design_kickoff`, a reusable prompt that asks Claude to gather the four brief fields (product type, audience, feeling, platform), then call `get_design_direction`.

## 10. `review_ui` rule set

Rules are pure functions over file contents. Each has an id, severity (`error`, `warn`, `info`), message and a concrete fix. Keep false positives low; a noisy reviewer gets ignored.

### Common
- `contrast-fail`: text/background pairs resolvable from tokens fail WCAG AA.
- `hardcoded-color`: color literals outside the generated token files.
- `too-many-accents`: more than one accent hue family in use.
- `pure-black-white`: `#000` text on `#FFF` background (suggest tinted neutrals).
- `font-size-sprawl`: more than 7 distinct font sizes in use.
- `off-grid-spacing`: spacing values not on the direction's scale.
- `radius-sprawl`: more than 3 distinct radii.
- `default-font-fallthrough`: body text still using the platform default when a direction font is set.
- `emoji-as-icon`: emoji characters in UI strings used as icons.
- `tiny-text`: text under 12sp/px for anything but legal captions.
- `low-touch-target`: interactive elements under 48dp (Android) or 44px (web).

### AI-look detectors
- `gradient-usage`: linear/radial gradients (allow only if the direction explicitly permits).
- `glassmorphism`: blur/backdrop-filter combined with translucent fills.
- `glow-shadow`: colored or large-blur shadows used as glow.
- `ai-palette`: navy/cyan/purple combos and known default palettes (for example Material default purple, common Tailwind indigo-to-purple gradient pairs).
- `shadow-everywhere`: shadows on more than a set share of containers.
- `uniform-pill-everything`: all containers fully rounded.

### Compose-specific
- Scan `Color(0x...)`, `Brush.linearGradient`, `Modifier.blur`, `Modifier.shadow`, `MaterialTheme` default usage without custom theme, `fontSize = N.sp` literals, `RoundedCornerShape(N.dp)` literals, `padding(N.dp)` literals.

### Android XML-specific
- Hardcoded `#RRGGBB` values in layouts, drawables and styles outside the generated `colors.xml`.
- `<gradient>` in drawables, and `android:elevation` / `cardElevation` used on most views.
- Text sizes in `dp` or `px` instead of `sp`; text below 12sp.
- Touch targets under 48dp.
- Default Material theme colors left in place (default purple/teal values) when a direction is set.
- `android:fontFamily` or `textAppearance` not coming from the generated resources.

### Web core (HTML, CSS, vanilla JavaScript)
- `backdrop-filter`, `filter: blur`, gradient backgrounds, glow `box-shadow`, `font-family` outside tokens, raw hex colors, arbitrary px values off the spacing scale.
- `outline: none` without a visible `:focus-visible` replacement.
- Missing `<meta name="viewport">`, missing `lang` on `<html>`, `<img>` without `alt`.
- Clickable `div`/`span` (click handler without role and keyboard support).
- Font sizes in fixed `px` where the token scale uses `rem`.
- Theme set only after load (flash of wrong theme).

### Tailwind
- `bg-gradient-*`, `from-*` / `via-*` / `to-*` combinations, `backdrop-blur-*`, `blur-*` on containers, glow shadows (`shadow-[...]` with color), arbitrary values such as `bg-[#...]` or `text-[17px]` that bypass the token mapping, default `indigo`/`purple`/`violet` palette classes when a direction defines its own.

### React (JSX / TSX / JS)
- Hex or `rgb()` literals in `style={{ ... }}` props, inline gradients, inline `fontSize` numbers off the scale.
- Emoji used as icons inside JSX text.
- `onClick` on non-interactive elements without `role`, `tabIndex` and keyboard handler.
- Missing `alt` on images; icon-only buttons without `aria-label`.
- Animations that run regardless of `prefers-reduced-motion`.

### Next.js
- Fonts loaded through a raw `<link>` to a font host instead of the framework's built-in font handling (`info`).
- Plain `<img>` where the framework image component fits (`info`).
- Theme applied only inside `useEffect` (flash of wrong theme) (`warn`).
- Client Components marked unnecessarily at the top of large trees (`info`).
- All framework-specific rules must be verified against the current Next.js docs before being written.

## 11. The Skill (`skills/premium-ui/SKILL.md`)

The Skill teaches Claude how to think; the MCP gives it tools and data. Write it with correct Skill frontmatter (`name`, `description`). Check the current Claude Skills documentation for the exact format before writing it. The description must make the Skill trigger on any request to design, build, restyle or review a UI, app screen, landing page, website or game interface.

SKILL.md must instruct Claude to:

1. **Never start designing before it has a brief.** Gather: what is being built, who it is for, what feeling is wanted, which platform. Ask at most four short questions if anything is missing.
2. **Detect the project's stack** (for example `package.json` with `next` or `react`, a plain HTML project, `build.gradle` with Compose, or `res/layout` XML files) and choose the matching platform id. If it is unclear, ask one short question. Then call `get_design_direction`, then `get_theme_code`, and write the theme files **first**, before any screen code.
3. Use only tokens from the generated theme. No hardcoded colors, sizes, radii or fonts in screen code.
4. Follow the layout blueprint for the surface type.
5. Apply the core principles:
   - One focal point per screen, one primary action per view.
   - Hierarchy through size, weight and spacing before color.
   - Restraint: one accent, tinted neutrals, few type sizes, consistent radii.
   - Whitespace is a feature; do not fill every gap.
   - Real content: realistic copy, no lorem ipsum, no "Welcome to the future of X."
   - States: empty, loading, error, offline and success states are part of the design.
   - Accessibility is not optional: contrast, touch targets, scalable text, reduced motion.
6. Never produce the AI-look patterns listed in `get_anti_patterns`.
7. After writing UI code, call `review_ui` and fix every `error` and `warn` finding before presenting the result.
8. If the user can show a screenshot, apply `get_review_rubric` to it.
9. If the user rejects a direction, call `get_design_direction` again with the feedback and take an alternate rather than tweaking randomly.

Put long reference material in `skills/premium-ui/references/` and keep SKILL.md short and scannable.

## 12. Installation and distribution

- Publish to npm as a public package (free). `package.json` needs `bin`, `files`, `type: "module"`, `engines`, `keywords` (mcp, design, ui, android, compose, tailwind, claude), `license`, `repository`.
- Claude Code install, documented in README:
  `claude mcp add premium-ui -- npx -y premium-ui-mcp`
- Claude Desktop install: show the `claude_desktop_config.json` snippet using `npx`. Verify exact config format against current docs.
- Skill install: document copying `skills/premium-ui/` into the user's Claude skills location, and a Claude Code plugin manifest if the current plugin format supports bundling MCP + Skill together. Verify against current docs before writing it.
- Also support running from a cloned repo (`node dist/index.js`) for contributors.
- Submit to MCP server directories and "awesome MCP" lists after launch.

Cost to the maintainer: zero. GitHub public repo and public npm packages are free. Nothing runs on any server owned by the maintainer. Add a `FUNDING.yml` and GitHub Sponsors link so people can sponsor directly. Check the current GitHub Sponsors terms when setting it up.

## 13. README requirements (it is the marketing)

Order:
1. One-line promise.
2. **Before / after screenshots**, same prompt with and without the tool, side by side, at the very top.
3. 60-second quick start (copy-paste install commands for Claude Code and Claude Desktop).
4. What it does: directions, theme code, blueprints, review.
5. Example prompts users can try.
6. List of tools with one example each.
7. List of directions with a preview image each.
8. Platform support table and roadmap.
9. How to contribute a direction or an adapter.
10. Privacy: runs fully local, no telemetry, no network calls.
11. License and font licensing note.
12. Sponsor link.

## 14. Build order and acceptance criteria

Build strictly in this order. After each milestone, run tests and show a short summary before moving on.

### Milestone 0: Repo bootstrap
- Initialize repo, TypeScript, lint, formatter, test runner, CI.
- Add LICENSE (MIT), CONTRIBUTING, CODE_OF_CONDUCT, this SPEC.md.
- Acceptance: `npm test` and `npm run build` pass on a clean clone; CI is green.

### Milestone 1: Schema, contrast math, first direction
- Implement `direction.schema.ts`, the loader and validator, `contrast.ts`.
- Author `fintech-trust` fully (light + dark).
- Acceptance: schema validation test passes; CI check fails if any text/background pair in any direction is below WCAG AA; generated JSON Schema is committed.

### Milestone 2: MCP server skeleton and read-only tools
- Stdio server, `list_directions`, `get_design_direction` (with brief matching and clarification output), `check_contrast`, `get_anti_patterns`.
- Acceptance: server starts via `node dist/index.js`; tested with an MCP inspector or a real client; unit tests for matching logic; nothing but protocol output on stdout.

### Milestone 3: Compose adapter
- `get_theme_code` for Compose (light, dark, both).
- Acceptance: snapshot tests; generated Kotlin compiles in a minimal sample Android project kept under `examples/compose-sample/` (or compile-checked in CI if feasible); fonts handled with documented instructions.

### Milestone 4: Web core (`html` + `tailwind`)
- Shared `web/tokens.ts` generator, `html` adapter (tokens.css, base.css, theme.js, starter index.html), `tailwind` adapter.
- Acceptance: snapshot tests; generated CSS validates; `examples/web-sample/` (plain HTML) renders correctly in light and dark with no theme flash; Tailwind output works in a minimal Tailwind project at the current major version.

### Milestone 5: React and Next.js
- `react` adapter (JS and TS output) and `nextjs` adapter (App Router first, Pages Router notes).
- Acceptance: `examples/react-sample/` and `examples/nextjs-sample/` install and build with current tooling; no hydration warnings from the theme setup; fonts load through the framework's recommended mechanism; snapshot tests for both `ts` and `js` variants.

### Milestone 6: Android XML
- `android-xml` adapter (colors, night colors, themes, type styles, dimens, font resources, shape drawables).
- Acceptance: a sample project in `examples/android-xml-sample/` builds and shows light and dark themes correctly; snapshot tests. If this milestone slips, move it and its review rules to v0.2 and continue.

### Milestone 7: `review_ui` for all shipped platforms
- Implement the rule set from section 10 incrementally, in this order: common, compose, web core, tailwind, react, nextjs, android-xml. Each rule ships with tests and fixtures.
- Acceptance: all `bad-*` fixtures produce the expected findings; all `good-*` fixtures produce none; false-positive rate reviewed manually on at least 5 realistic snippets per platform.

### Milestone 8: Blueprints and rubric
- `get_layout_blueprint` for landing, mobile app, game UI, dashboard, e-commerce; `get_review_rubric`.
- Acceptance: schema-validated blueprint files; tool tests.

### Milestone 9: Skill and remaining directions
- Write `SKILL.md` (including stack detection) and references.
- Author the rest of the directions (target 6 to 8 total), each reviewed by a human with screenshots.
- Acceptance: every direction passes CI contrast and license checks; each has a preview image in `examples/`.

### Milestone 10: Proof and polish
- Create `examples/before-after/`: at least 4 pairs (landing page in HTML or Next.js, React dashboard, Compose app screen, game screen), same prompt with and without the tool.
- Finish README (with the platform table), CHANGELOG, issue templates, FUNDING.yml.
- Acceptance: a fresh user can follow the README and be running in under 2 minutes.

### Milestone 11: Release v0.1.0
- Version tag, npm publish, GitHub release notes.
- Acceptance: `npx -y <package-name>` works on a machine that has never seen the repo.

### Later
- v0.2: Flutter and React Native adapters plus review rules (and Android XML, if it was moved out of v0.1).
- v0.3: SwiftUI.
- Contributor guide for adding a direction and an adapter, with templates.

## 15. Quality bar and engineering standards

- Every tool has input validation, helpful error messages and tests.
- No `any` in TypeScript without a comment explaining why.
- No network access at runtime. Add a test or lint rule that fails if network libraries are imported in `src/`.
- Deterministic output: same input gives the same output, byte for byte.
- Keep the package small. Report install size in CI and fail on large regressions.
- Documentation of every rule and every direction field.
- Semantic versioning. Direction file changes that alter output are noted in the CHANGELOG.

## 16. Legal and licensing notes

- Project license: MIT.
- Fonts: only open-license fonts (for example OFL). Store license name and source per font in the direction JSON, and list them in README.
- No third-party brand assets, logos, trademarks or proprietary fonts in the repo or in any direction.
- Do not describe directions as "like Brand X" in a way that implies affiliation. Principles learned from good products are fine; copies are not.

## 17. Risks and how to handle them

- **Direction quality is the product.** A few excellent directions beat many mediocre ones. Human review with real screenshots is mandatory for every direction.
- **Review rules can be noisy.** Start with high-confidence rules; add others only with fixtures proving low false positives.
- **MCP and Skills formats evolve.** Always check current official documentation before writing config, SDK usage or manifests, and keep those parts isolated so they are easy to update.
- **Scope creep across platforms.** The web family shares one token generator, so it stays cheap. Every adapter still needs its own fixtures and sample project. If time runs short, cut Android XML first, then Next.js Pages Router notes.
- **Framework APIs change quickly** (Next.js, Tailwind, Material Components, build tooling). Keep framework-specific output isolated in its adapter and verify against current official docs before every release.
- **"Premium" is partly subjective.** Make the principles explicit and the checks measurable so quality does not depend on taste alone.

## 18. Instructions for Claude Code (read this last)

1. Read this whole document first. Then restate the plan in a short summary and list any open questions before writing code.
2. Work milestone by milestone. At the end of each, run the tests, summarize what was done, and wait for confirmation before continuing.
3. When something depends on an external API, SDK, file format or platform behavior (MCP SDK, Skill format, Claude Desktop config, Android Gradle setup, Tailwind config format, npm publishing), consult current official documentation instead of relying on memory.
4. Keep commits small and meaningful, with clear messages.
5. If a requirement here conflicts with what is technically possible, say so and propose the closest alternative rather than silently changing the design.
6. Never add paid services, API keys, telemetry or network calls.
7. When authoring directions, flag clearly that they need human visual review, and produce a preview page or screenshot script to make that review easy.
