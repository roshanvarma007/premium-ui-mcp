# AI-look anti-patterns

The `get_anti_patterns` tool returns the authoritative, platform-specific list. This is the
short version to keep in mind while writing code.

| Never | Why | Instead |
|---|---|---|
| Decorative gradients (`linear-gradient`, `bg-gradient-to-r from-indigo-500`, `Brush.linearGradient`, `<gradient>`) | The strongest single tell of generated UI | Flat surface and accent tokens |
| Glassmorphism (`backdrop-filter: blur`, `backdrop-blur-xl bg-white/10`, `Modifier.blur`) | Hurts legibility, reads as a template | Opaque surfaces with a hairline border |
| Glow shadows (`0 0 40px rgba(99,102,241,.6)`, `shadow-indigo-500/50`, `spotColor = accent`) | Neon effect pulls focus | Direction elevation tokens, or a border |
| Navy + cyan + purple, Material purple `#6200EE` / `#6750A4`, Tailwind indigo/violet | Signals "no decisions were made" | The chosen direction palette |
| Emoji as icons (🚀 ✨ 💰) | Render differently everywhere, cannot be themed | One icon set (Lucide, Material Symbols) |
| Shadow on every card | When everything floats, nothing does | Spacing and hairlines; elevate overlays only |
| Everything pill-shaped | Containers and controls become indistinguishable | sm / md / lg radii; full only for chips |
| 8+ font sizes, arbitrary values (`text-[17px]`, `fontSize = 15.sp`) | No type system | The 7 type roles |
| Off-grid spacing (13px, 22px, `p-[13px]`) | Breaks rhythm | Spacing tokens |
| Inter / Roboto everywhere | Typographic default palette | The direction's font pairing |
| Hex literals in screens | Drift, broken dark mode | Tokens only |
| Pure black on pure white | Glare, harsh | Tinted neutrals |
| Grey-on-grey text, 10px captions, 32px buttons | Fails real users | AA contrast, 12+ text, 44/48 targets |
| "Welcome to the future of X", lorem ipsum | Looks fake regardless of styling | Specific, realistic copy |
| Only the happy path | Unfinished product | Empty, loading, error, offline, success |
| Several primary buttons | Unclear next step | One primary per view |
