# Platform notes

Always generate the theme with `get_theme_code` first; these notes show how to *use* it.

## HTML + CSS (`html`)

- Files: `css/tokens.css`, `css/fonts.css`, `css/base.css`, `js/theme.js`, `index.html`.
- Keep the inline theme `<script>` first in `<head>`, before stylesheets (no flash).
- Use `.t-display`, `.t-body`, ... for text; `var(--color-*)`, `var(--spacing-N)`,
  `var(--radius-md)` in page CSS. `.btn-primary`, `.btn-secondary`, `.card`, `.input` exist.

```css
.summary { padding: var(--spacing-6); border: 1px solid var(--color-border); border-radius: var(--radius-md); }
```

## Tailwind v4 (`tailwind`, combined with html / react / nextjs)

- Configured in CSS (`@theme`); default palettes, off-grid spacing and blur utilities are
  removed on purpose, so `bg-indigo-500` and `p-5` do not exist.
- Use `bg-bg`, `bg-surface`, `text-text`, `text-text-muted`, `border-border`, `bg-accent`
  `text-on-accent`, `p-4`, `gap-6`, `rounded-md`, `shadow-overlay`, `t-title`, `min-h-touch`.
- Never use arbitrary values for colors, sizes or spacing (`text-[17px]`, `bg-[#...]`).
  Dark mode comes from tokens; `dark:` is rarely needed.

## React (`react`)

- `src/theme/` holds tokens.css, base.css (or the Tailwind entry), `tokens.ts`, `theme.tsx`
  (`ThemeProvider`, `useTheme`), `ThemeToggle.tsx`, `useReducedMotion.ts`.
- Prefer classes; for inline styles import `{ color, space, text }` from the tokens module.
  `palette.light` / `palette.dark` are raw hex for charts and canvas only.
- `useTheme().theme` is `null` until hydrated; render a neutral state first.

## Next.js (`nextjs`)

- App Router: `app/layout.tsx` includes the viewport `themeColor`, fonts via `next/font`
  (local by default), the inline theme script and `suppressHydrationWarning` on `<html>`.
  Keep pages as Server Components; only `components/theme/*` and interactive leaves are
  `'use client'`.
- Pages Router: `pages/_document` and `pages/_app` (global CSS only in `_app`).
- Use `next/image` with `alt`, `next/link`, and the tokens.

## Jetpack Compose (`compose`)

- Wrap the UI in `AppTheme { }`. Read tokens with `AppTheme.colors.*`, `AppTheme.type.*`,
  `AppTheme.shapes.*` and `Spacing.sN` (`s4` = 16dp on a 4dp grid).
- Stock Material 3 components already use the direction through `MaterialTheme`.
- No `Color(0x...)`, `N.sp` or `RoundedCornerShape(N.dp)` in screens. Use
  `Modifier.heightIn(min = Spacing.minTouchTarget)` for custom tappables.
- Put the font files in `res/font/` with the exact names `next_steps` lists.

```kotlin
Text("Recent activity", style = AppTheme.type.title, color = AppTheme.colors.text,
    modifier = Modifier.padding(horizontal = Spacing.s4))
```

## Android Views / XML (`android-xml`)

- `android:theme="@style/Theme.App"` on the application. Activities extend `AppCompatActivity`.
- Text: `android:textAppearance="?attr/textAppearanceBodyLarge"` (never `textSize` in layouts).
  Colors: `@color/ds_*` or `?attr/colorOnSurface`. Spacing: `@dimen/ds_space_N`.
- `MaterialButton` (primary), `style="?attr/materialButtonOutlinedStyle"` (secondary),
  `MaterialCardView`, and `TextInputLayout` with a hint as its visible label.
