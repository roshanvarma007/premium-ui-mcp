---
name: premium-ui
description: Design, build, restyle or review any UI (app screen, website, landing page, dashboard, store, game UI) with a premium, context-fit design instead of the generic AI look.
when_to_use: Use whenever the user asks to design, build, create, redesign, restyle, theme, polish or review a user interface, Android app, Jetpack Compose screen, XML layout, website, landing page, HTML/CSS page, React or Next.js page, Tailwind UI, dashboard, e-commerce store or game interface, or says the UI looks generic, AI-made, ugly or unprofessional.
license: MIT
---

# Premium UI

Interfaces should look like a senior product designer and engineer made them for this
specific product. Never ship the AI-look defaults: gradients, glassmorphism, glow shadows,
navy with cyan or purple, Material purple, Inter everywhere, emoji icons, random sizes.

This skill works with the **premium-ui MCP server** tools: `get_design_direction`,
`get_theme_code`, `get_layout_blueprint`, `get_anti_patterns`, `review_ui`,
`check_contrast`, `get_review_rubric`, `list_directions`. If they are not available, follow
the same steps using [references/principles.md](references/principles.md) and say that the
MCP server would make the result more consistent.

## Workflow

1. **Get the brief before designing.** You need four things: what is being built, who it is
   for, the feeling (2 or 3 words), and the platform. Ask only for what is missing, in at
   most four short questions, in one message. Do not start styling before you have them.

2. **Detect the platform** from the project, and ask one short question only if it is unclear:
   | Signal | Platform id |
   |---|---|
   | `package.json` with `next` | `nextjs` (App Router if `app/` exists, else `pages`) |
   | `package.json` with `react` (Vite, CRA, etc.) | `react` |
   | `tailwindcss` in dependencies or `@import "tailwindcss"` | add `tailwind` (for example `["nextjs","tailwind"]`) |
   | Plain `.html` and `.css` files, no framework | `html` |
   | `build.gradle(.kts)` with Compose (`buildFeatures { compose = true }`, `androidx.compose`) | `compose` |
   | `res/layout/*.xml` with Views, no Compose | `android-xml` |
   Use `language: "ts"` when the project has TypeScript (`tsconfig.json`), otherwise `"js"`.

3. **Choose the direction.** Call `get_design_direction` with the brief. If it returns
   `needs_clarification`, ask those questions and call it again. Tell the user the choice in
   two sentences and name the alternates.

4. **Write the theme first.** Call `get_theme_code` with the direction id and platform (and
   `package_name` from the Android `namespace`). Write every returned file *before any screen
   code*, then do the `next_steps` (fonts, imports, dependencies). Fonts are self-hosted by
   default; only use `font_source: "google-fonts"` if the user asks for it.

5. **Lay out with the blueprint.** Call `get_layout_blueprint` for the surface (landing, app,
   game, dashboard, ecommerce) and follow its section order, copy limits and states.

6. **Build screens with tokens only.** No hardcoded colors, font sizes, radii, spacing or
   font families in screen code: use the generated CSS variables / Tailwind theme utilities,
   `AppTheme.*` and `Spacing.*` in Compose, or `@color/ds_*`, `@dimen/ds_*` and text appearances
   in XML. Read `get_anti_patterns` for the platform once before writing UI.

7. **Apply the principles** (details in [references/principles.md](references/principles.md)):
   - One focal point and one primary action per view.
   - Hierarchy through size, weight and spacing before color.
   - Restraint: one accent, tinted neutrals, few type sizes, at most 3 radii.
   - Whitespace is a feature; do not fill every gap.
   - Real content: realistic names, numbers and copy. No lorem ipsum, no "Welcome to the future of X".
   - States are design: empty, loading, error, offline and success.
   - Accessibility is not optional: contrast, touch targets (48dp / 44px), scalable text, reduced motion, labels.

8. **Review before presenting.** Call `review_ui` with the changed screen files *and* the
   generated theme files (so tokens resolve) plus `direction_id`. Fix every `error` and `warn`
   finding, then run it again. Mention any remaining `info` findings briefly.

9. **Screenshots.** When the user shares a screenshot (or you can take one), apply
   `get_review_rubric`, report the score and the three weakest criteria with concrete fixes.

10. **If the user rejects the direction**, call `get_design_direction` again with their
    feedback added to `feelings` or `constraints`, and switch to an alternate. Do not tweak
    random values on the rejected one.

## When the request is small

For a single component or a quick fix in a project that already has generated theme files,
skip steps 1-5: reuse the existing tokens, then still run step 8.

## References

- [references/principles.md](references/principles.md): the design principles in depth (hierarchy, spacing, color, type).
- [references/anti-patterns.md](references/anti-patterns.md): the AI-look tells per platform and what to do instead.
- [references/platforms.md](references/platforms.md): platform notes (Compose, XML, Next.js, React, Tailwind, HTML) and token usage examples.
