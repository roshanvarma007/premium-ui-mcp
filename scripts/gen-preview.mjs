// Generates a self-contained preview page for a design direction, for human visual review.
// Usage: npm run preview -- <direction-id>   (writes examples/previews/<id>.html)
// Light and dark are rendered side by side from the direction data, with self-hosted fonts.
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { parseHex, rgbToOklch } from '../dist/a11y/color.js';
import { contrastHex, floorRatio } from '../dist/a11y/contrast.js';
import { resolvePalette, spacingTokens, typeRoles } from '../dist/adapters/model.js';
import { fluid, fontFaceCss, rem, webFontFiles } from '../dist/adapters/web/tokens.js';
import { getDirection, getDirections } from '../dist/directions/index.js';
import { contrastReport, validateDirection } from '../dist/directions/validate.js';

const args = process.argv.slice(2);
const compare = args.includes('--compare');
const id = args.find((a) => !a.startsWith('--')) ?? 'fintech-trust';
const d = getDirection(id);
if (!d) {
  console.error(
    `Unknown direction "${id}". Available: ${getDirections()
      .map((x) => x.id)
      .join(', ')}`,
  );
  process.exit(1);
}

const outDir = new URL('../examples/previews/', import.meta.url);
const fontDir = new URL('./fonts/', outDir);
mkdirSync(fontDir, { recursive: true });
const sourceFonts = new URL('../examples/web-sample/fonts/', import.meta.url);
const missingFonts = [];
for (const f of webFontFiles(d)) {
  const src = new URL(f.file, sourceFonts);
  if (existsSync(src)) copyFileSync(src, new URL(f.file, fontDir));
  else if (!existsSync(new URL(f.file, fontDir))) missingFonts.push(f.file);
}
for (const n of readdirSync(sourceFonts))
  if (n.endsWith('.txt')) copyFileSync(new URL(n, sourceFonts), new URL(n, fontDir));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const kebab = (s) => s.replace(/_/g, '-');

function paletteVars(mode, dir = d) {
  const p = resolvePalette(dir.color[mode]);
  const shadows = dir.elevation.levels
    .filter((l) => l.shadow)
    .map(
      (l) =>
        `--shadow-${kebab(l.name)}: ${(mode === 'dark' ? l.shadow_dark : undefined) ?? l.shadow};`,
    );
  return [...Object.entries(p).map(([k, v]) => `--color-${kebab(k)}: ${v};`), ...shadows].join(' ');
}

const t = d.typography;
const mono = t.mono_family ?? t.body_family;
const stack = (f) =>
  `"${f.name}", ${f.fallback.map((x) => (/\s/.test(x) ? `"${x}"` : x)).join(', ')}`;
const typeVars = typeRoles(d)
  .map(({ role, style }) => {
    const n = kebab(role);
    const range = t.web_responsive?.[role];
    return `--text-${n}: ${range ? fluid(range.min, range.max) : rem(style.size)}; --lh-${n}: ${(style.line_height / style.size).toFixed(4)}; --ls-${n}: ${style.letter_spacing}em; --fw-${n}: ${style.weight};`;
  })
  .join('\n    ');
const roleCss = typeRoles(d)
  .map(({ role, family }) => {
    const n = kebab(role);
    return `.t-${n} { font-family: var(--font-${family}); font-size: var(--text-${n}); line-height: var(--lh-${n}); letter-spacing: var(--ls-${n}); font-weight: var(--fw-${n}); }`;
  })
  .join('\n  ');
const space = spacingTokens(d);

function swatches(mode) {
  const p = resolvePalette(d.color[mode]);
  const keys = [
    'bg',
    'surface',
    'surface_alt',
    'text',
    'text_muted',
    'border',
    'border_strong',
    'accent',
    'on_accent',
    'success',
    'warning',
    'error',
  ];
  return keys
    .map((k) => {
      const onBg = floorRatio(contrastHex(p[k], p.bg));
      return `<li class="swatch"><span class="chip" style="background:${p[k]}"></span><span class="t-label">${k}</span><span class="t-caption muted mono">${p[k]} · ${onBg}:1 on bg</span></li>`;
    })
    .join('');
}

function panel(mode) {
  const p = resolvePalette(d.color[mode]);
  const typeRows = typeRoles(d)
    .map(
      ({ role, style }) =>
        `<div class="type-row"><span class="t-caption muted mono">${role} · ${style.size}/${style.line_height} · ${style.weight}</span><span class="t-${kebab(role)}">${role === 'display' ? '$12,480.56' : role === 'headline' ? 'Shared household budgets' : role === 'title' ? 'Recent activity' : 'Bills due this week are paid automatically on the date you choose.'}</span></div>`,
    )
    .join('');
  return `
<section class="panel" style="${paletteVars(mode)}" aria-label="${mode} theme">
  <header class="panel-head"><span class="t-label muted">${mode === 'light' ? 'Light' : 'Dark'} theme</span><span class="t-caption muted mono">bg ${p.bg} · text ${p.text} · accent ${p.accent}</span></header>

  <div class="hero">
    <p class="t-label muted">Available balance</p>
    <p class="t-display num"><span class="muted">$</span>12,480<span class="muted">.56</span></p>
    <p class="t-body-small" style="color: var(--color-success)">+ $320.10 this month</p>
    <div class="row gap-3 mt-6">
      <button class="btn btn-primary" type="button">Send money</button>
      <button class="btn btn-secondary" type="button">Request</button>
      <button class="btn btn-text" type="button">View statements</button>
    </div>
  </div>

  <div class="grid-2 mt-8">
    <article class="card">
      <h3 class="t-title">Everyday account</h3>
      <p class="t-caption muted">Current account ·· 4021</p>
      <p class="t-headline num mt-6">$8,214.30</p>
    </article>
    <article class="card card-interactive">
      <h3 class="t-title">Savings</h3>
      <p class="t-caption muted">3.1% a year · interactive card (raised)</p>
      <p class="t-headline num mt-6">$4,266.26</p>
    </article>
  </div>

  <h3 class="t-title mt-8">Recent activity</h3>
  <ul class="list card mt-3">
    <li><span><span class="t-body">Northside Grocers</span><span class="t-caption muted block">Today, 09:41 · Card ending 4021</span></span><span class="t-body num">− $48.20</span></li>
    <li><span><span class="t-body">Salary · Halden &amp; Co.</span><span class="t-caption muted block">Yesterday · Transfer</span></span><span class="t-body num" style="color: var(--color-success)">+ $3,250.00</span></li>
    <li><span><span class="t-body">City Water Utility</span><span class="t-caption muted block">3 Nov · Direct debit</span></span><span class="t-body num">− $62.75</span></li>
  </ul>

  <div class="field mt-8">
    <label class="t-label" for="note-${mode}">Note to recipient</label>
    <input class="input" id="note-${mode}" value="Rent for November">
    <span class="t-caption muted">Visible to the person you pay</span>
  </div>
  <div class="field mt-4">
    <label class="t-label" for="amount-${mode}">Amount</label>
    <input class="input input-error num" id="amount-${mode}" value="0.00" aria-invalid="true">
    <span class="t-caption" style="color: var(--color-error)">Enter an amount greater than $0.</span>
  </div>

  <div class="row gap-3 mt-6">
    <span class="badge" style="color: var(--color-success)">● Paid</span>
    <span class="badge" style="color: var(--color-warning)">● Due soon</span>
    <span class="badge" style="color: var(--color-error)">● Overdue</span>
  </div>

  <h3 class="t-label muted mt-12">Palette</h3>
  <ul class="swatches mt-3">${swatches(mode)}</ul>

  <h3 class="t-label muted mt-12">Type scale</h3>
  <div class="mt-3">${typeRows}</div>

  <h3 class="t-label muted mt-12">Spacing, radius, elevation</h3>
  <div class="row gap-2 mt-3 wrap">${space
    .filter((s) => s.value > 0)
    .map((s) => `<span class="space" style="width:${rem(s.value)}" title="${s.value}px"></span>`)
    .join('')}</div>
  <p class="t-caption muted mono mt-2">${space.map((s) => s.value).join(' · ')} px</p>
  <div class="row gap-4 mt-4 wrap">
    ${['sm', 'md', 'lg'].map((r) => `<span class="radius" style="border-radius:${rem(d.radius[r])}"><span class="t-caption muted">${r} ${d.radius[r]}</span></span>`).join('')}
    ${d.elevation.levels.map((l) => `<span class="radius elev" style="box-shadow:${l.shadow ? `var(--shadow-${kebab(l.name)})` : 'none'}"><span class="t-caption muted">${l.name}</span></span>`).join('')}
  </div>
</section>`;
}

const failing = contrastReport(d).filter((c) => !c.pass);
const contrastRows = contrastReport(d)
  .map(
    (c) =>
      `<tr><td>${c.mode}</td><td>${c.fg} on ${c.bg}</td><td class="num">${c.ratio}:1</td><td class="num">${c.min}:1</td><td>${c.pass ? 'pass' : 'FAIL'}</td></tr>`,
  )
  .join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)}: direction preview</title>
<style>
${fontFaceCss(d, './fonts/').replace(/\/\*[\s\S]*?\*\/\n\n/, '')}
  :root {
    --font-display: ${stack(t.display_family)};
    --font-body: ${stack(t.body_family)};
    --font-mono: ${stack(mono)};
    ${typeVars}
    --radius-sm: ${rem(d.radius.sm)}; --radius-md: ${rem(d.radius.md)}; --radius-lg: ${rem(d.radius.lg)};
    ${space.map((s) => `--spacing-${s.name}: ${rem(s.value)};`).join(' ')}
    --ease: ${d.motion.easing}; --fast: ${d.motion.duration_ms.fast}ms;
  }
  * { box-sizing: border-box; margin: 0; }
  body { font-family: var(--font-body); background: #E9E8E4; color: #16181D; -webkit-font-smoothing: antialiased; }
  ${roleCss}
  .page-head { padding: 32px 32px 16px; max-width: 1400px; margin: 0 auto; }
  .page-head p { max-width: 70ch; }
  .panels { display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; padding: 16px 32px 32px; max-width: 1400px; margin: 0 auto; }
  .panel { background: var(--color-bg); color: var(--color-text); border-radius: 16px; padding: var(--spacing-8); ${d.typography.numerals === 'tabular' ? 'font-variant-numeric: tabular-nums;' : ''} }
  .panel-head { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; padding-bottom: var(--spacing-4); border-bottom: 1px solid var(--color-border); margin-bottom: var(--spacing-8); }
  .muted { color: var(--color-text-muted); }
  .mono { font-family: var(--font-mono); }
  .num { font-variant-numeric: tabular-nums; }
  .block { display: block; }
  .row { display: flex; align-items: center; } .wrap { flex-wrap: wrap; }
  .gap-2 { gap: var(--spacing-2); } .gap-3 { gap: var(--spacing-3); } .gap-4 { gap: var(--spacing-4); }
  .mt-2 { margin-top: var(--spacing-2); } .mt-3 { margin-top: var(--spacing-3); } .mt-4 { margin-top: var(--spacing-4); } .mt-6 { margin-top: var(--spacing-6); } .mt-8 { margin-top: var(--spacing-8); } .mt-12 { margin-top: var(--spacing-12); }
  .hero .t-display { margin-top: var(--spacing-2); }
  .btn { display: inline-flex; align-items: center; min-height: 44px; padding: 0 var(--spacing-4); border-radius: var(--radius-md); border: 1px solid transparent; font: inherit; font-size: var(--text-body-small); font-weight: var(--fw-title); cursor: pointer; transition: background-color var(--fast) var(--ease); }
  .btn-primary { background: var(--color-accent); color: var(--color-on-accent); }
  .btn-primary:hover { background: color-mix(in srgb, var(--color-accent) 88%, var(--color-text)); }
  .btn-secondary { background: transparent; color: var(--color-text); border-color: var(--color-border-strong); }
  .btn-text { background: transparent; color: var(--color-link); padding: 0 var(--spacing-2); }
  .btn:focus-visible, .input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4); }
  .card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--spacing-6); }
  .card-interactive { box-shadow: var(--shadow-raised); }
  .list { list-style: none; padding: 0; }
  .list li { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-4); padding: var(--spacing-4) 0; }
  .list li + li { border-top: 1px solid var(--color-border); }
  .list.card { padding: 0 var(--spacing-6); }
  .field { display: grid; gap: var(--spacing-2); }
  .input { min-height: 44px; padding: 0 var(--spacing-3); border-radius: var(--radius-md); border: 1px solid var(--color-border-strong); background: var(--color-surface); color: var(--color-text); font: inherit; }
  .input-error { border-color: var(--color-error); }
  .badge { display: inline-flex; gap: 6px; align-items: center; font-size: var(--text-label); font-weight: var(--fw-label); padding: 4px 10px; border-radius: 999px; background: var(--color-surface-alt); }
  .swatches { list-style: none; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--spacing-3); }
  .swatch { display: grid; gap: 2px; }
  .chip { height: 44px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); }
  .type-row { display: grid; gap: 4px; padding: var(--spacing-3) 0; border-bottom: 1px solid var(--color-border); }
  .space { height: 16px; background: var(--color-accent); border-radius: 2px; opacity: .8; }
  .radius { width: 96px; height: 64px; display: grid; place-items: center; background: var(--color-surface); border: 1px solid var(--color-border-strong); }
  .elev { border-color: var(--color-border); border-radius: var(--radius-md); }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #D8D6D0; }
  .meta { max-width: 1400px; margin: 0 auto; padding: 0 32px 48px; display: grid; grid-template-columns: repeat(auto-fit, minmax(420px, 1fr)); gap: 24px; }
  .meta section { background: #FFFFFF; border-radius: 12px; padding: 24px; }
  .meta ul { padding-left: 18px; } .meta li { margin: 4px 0; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
  <header class="page-head">
    <p class="t-label" style="color:#6B6F76">premium-ui-mcp · direction preview · needs human review</p>
    <h1 class="t-headline" style="font-family: var(--font-display); margin-top: 8px">${esc(d.name)} <span style="color:#6B6F76;font-size:0.6em">(${d.id} v${d.version})</span></h1>
    <p class="t-body" style="margin-top:8px;color:#4A4E55">${esc(d.summary)}</p>
    <p class="t-caption" style="margin-top:8px;color:#6B6F76">Fonts: ${esc(t.display_family.name)} (display, ${t.display_family.license}), ${esc(t.body_family.name)} (body, ${t.body_family.license})${t.mono_family ? `, ${esc(t.mono_family.name)} (mono, ${t.mono_family.license})` : ''}. Contrast: ${failing.length === 0 ? 'all required pairs pass WCAG AA' : `${failing.length} pair(s) FAIL`}.${missingFonts.length ? ` Missing font files: ${missingFonts.join(', ')}.` : ''}</p>
  </header>
  <main class="panels">${panel('light')}${panel('dark')}</main>
  <div class="meta">
    <section>
      <h2 class="t-title">Review checklist</h2>
      <ul class="t-body-small" style="margin-top:12px">
        <li>Does it feel ${esc(d.mood.join(', '))}? Would it fit: ${esc(d.best_for.slice(0, 5).join(', '))}?</li>
        <li>Is the dark theme its own design (not an inversion), with comfortable contrast?</li>
        <li>Is there exactly one accent, and do semantic colors read as meaning only?</li>
        <li>Do display and body faces pair well at every size? Are money values steady (tabular)?</li>
        <li>Is anything generic, glossy, or reminiscent of a specific brand?</li>
      </ul>
      <h2 class="t-title" style="margin-top:20px">Signature details</h2>
      <ul class="t-body-small">${d.signature_details.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <h2 class="t-title" style="margin-top:20px">Avoid</h2>
      <ul class="t-body-small">${d.avoid.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
    </section>
    <section>
      <h2 class="t-title">Contrast (WCAG AA)</h2>
      <table style="margin-top:12px"><thead><tr><th>Mode</th><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${contrastRows}</tbody></table>
    </section>
  </div>
</body>
</html>
`;

if (!compare) {
  writeFileSync(new URL(`${id}.html`, outDir), html);
  console.log(
    `wrote examples/previews/${id}.html${missingFonts.length ? ` (missing fonts: ${missingFonts.join(', ')})` : ''}`,
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Compare mode: render the options in previews/variants/<id>.json side by side.
// Each option overrides some palette colors; every option is validated against the same
// WCAG rules as shipped directions before it is shown.
// ---------------------------------------------------------------------------
const variantFile = new URL(`./variants/${id}.json`, outDir);
if (!existsSync(variantFile)) {
  console.error(`No variants file: examples/previews/variants/${id}.json`);
  process.exit(1);
}
const spec = JSON.parse(readFileSync(variantFile, 'utf8'));
const options = spec.options.map((o) => {
  const dir = structuredClone(d);
  for (const mode of ['light', 'dark']) Object.assign(dir.color[mode], o.color?.[mode] ?? {});
  const issues = validateDirection(dir);
  return { ...o, dir, issues };
});
const invalid = options.filter((o) => o.issues.length > 0);
if (invalid.length > 0) {
  for (const o of invalid)
    console.error(`${o.key} is invalid: ${o.issues.map((i) => i.message).join('; ')}`);
  process.exit(1);
}

const hueOf = (hex) => rgbToOklch(parseHex(hex)).h;
const hueGap = (a, b) => {
  const g = Math.abs(hueOf(a) - hueOf(b)) % 360;
  return Math.round(g > 180 ? 360 - g : g);
};

function optionPanel(o, mode) {
  const p = resolvePalette(o.dir.color[mode]);
  const gap = hueGap(p.accent, p.success);
  const ratio = (a, b) => floorRatio(contrastHex(a, b));
  return `
<section class="panel" style="${paletteVars(mode, o.dir)}" aria-label="Option ${o.key}, ${mode} theme">
  <header class="panel-head"><span class="t-label">Option ${o.key} · ${mode === 'light' ? 'Light' : 'Dark'}</span><span class="t-caption muted mono">accent ${p.accent} · success ${p.success}</span></header>
  <p class="t-label muted">Available balance</p>
  <p class="t-display num"><span class="muted">$</span>12,480<span class="muted">.56</span></p>
  <p class="t-body-small" style="color: var(--color-success)">+ $320.10 this month</p>
  <div class="row gap-3 mt-6 wrap">
    <button class="btn btn-primary" type="button">Send money</button>
    <button class="btn btn-secondary" type="button">Request</button>
    <button class="btn btn-text" type="button">View statements</button>
  </div>
  <ul class="list card mt-8">
    <li><span><span class="t-body">Northside Grocers</span><span class="t-caption muted block">Today, 09:41</span></span><span class="t-body num">− $48.20</span></li>
    <li><span><span class="t-body">Salary · Halden &amp; Co.</span><span class="t-caption muted block">Yesterday · Transfer</span></span><span class="t-body num" style="color: var(--color-success)">+ $3,250.00</span></li>
    <li><span><span class="t-body">Interest paid</span><span class="t-caption muted block">1 Nov · Savings</span></span><span class="t-body num" style="color: var(--color-success)">+ $11.04</span></li>
  </ul>
  <div class="row gap-3 mt-6 wrap">
    <span class="badge" style="color: var(--color-success)">● Paid</span>
    <span class="badge" style="color: var(--color-warning)">● Due soon</span>
    <span class="badge" style="color: var(--color-error)">● Overdue</span>
  </div>
  <div class="pair mt-8">
    <div><span class="chip" style="background:${p.accent}"></span><span class="t-label">accent</span><span class="t-caption muted mono">${p.accent} · ${ratio(p.accent, p.bg)}:1 on bg</span></div>
    <div><span class="chip" style="background:${p.success}"></span><span class="t-label">success</span><span class="t-caption muted mono">${p.success} · ${ratio(p.success, p.bg)}:1 on bg</span></div>
    <div><span class="t-label">hue gap</span><span class="t-headline num">${gap}°</span><span class="t-caption muted">accent vs success (OKLCH)</span></div>
  </div>
</section>`;
}

const summaryRows = ['light', 'dark']
  .flatMap((mode) => [
    { label: 'Current', dir: d, mode },
    ...options.map((o) => ({ label: `Option ${o.key}`, dir: o.dir, mode })),
  ])
  .map(({ label, dir, mode }) => {
    const p = dir.color[mode];
    return `<tr><td>${mode}</td><td>${label}</td><td class="mono"><span class="dot" style="background:${p.accent}"></span>${p.accent}</td><td class="mono"><span class="dot" style="background:${p.success}"></span>${p.success}</td><td class="num">${hueGap(p.accent, p.success)}°</td><td class="num">${floorRatio(contrastHex(p.accent, p.bg))}:1</td><td class="num">${floorRatio(contrastHex(p.success, p.bg))}:1</td><td class="num">${floorRatio(contrastHex(p.on_accent, p.accent))}:1</td></tr>`;
  })
  .join('');

const style = html.match(/<style>[\s\S]*?<\/style>/)[0].replace(
  '</style>',
  `  .compare { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; padding: 8px 32px 32px; max-width: 1400px; margin: 0 auto; }
  @media (max-width: 900px) { .compare { grid-template-columns: 1fr; } }
  .compare-label { max-width: 1400px; margin: 0 auto; padding: 8px 32px 0; }
  .pair { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--spacing-4); padding-top: var(--spacing-6); border-top: 1px solid var(--color-border); }
  .pair > div { display: grid; gap: 2px; align-content: start; }
  .dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; border: 1px solid rgba(0,0,0,.25); }
  .opt-desc { max-width: 1400px; margin: 0 auto; padding: 0 32px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  @media (max-width: 900px) { .opt-desc { grid-template-columns: 1fr; } }
</style>`,
);

const compareHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(d.name)}: options compared</title>
${style}
</head>
<body>
  <header class="page-head">
    <p class="t-label" style="color:#6B6F76">premium-ui-mcp · direction options · pick one</p>
    <h1 class="t-headline" style="font-family: var(--font-display); margin-top: 8px">${esc(d.name)}: ${esc(spec.question)}</h1>
    <p class="t-caption" style="margin-top:8px;color:#6B6F76">Both options pass the same WCAG AA contrast checks as the shipped direction. Everything except the colors named below is identical.</p>
  </header>
  <div class="opt-desc">${options.map((o) => `<p class="t-body-small"><strong>${esc(o.name)}.</strong> ${esc(o.description)}</p>`).join('')}</div>
  <div class="compare mt-6">
    ${['light', 'dark'].map((mode) => options.map((o) => optionPanel(o, mode)).join('')).join('')}
  </div>
  <div class="meta">
    <section style="grid-column: 1 / -1">
      <h2 class="t-title">Accent and success, side by side (current shown for reference)</h2>
      <table style="margin-top:12px"><thead><tr><th>Mode</th><th></th><th>Accent</th><th>Success</th><th>Hue gap</th><th>Accent on bg</th><th>Success on bg</th><th>On-accent on accent</th></tr></thead><tbody>${summaryRows}</tbody></table>
    </section>
  </div>
</body>
</html>
`;
writeFileSync(new URL(`${id}-compare.html`, outDir), compareHtml);
console.log(
  `wrote examples/previews/${id}-compare.html (options: ${options.map((o) => o.key).join(', ')})`,
);
