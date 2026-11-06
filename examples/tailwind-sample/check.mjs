// Verifies the generated Tailwind theme: direction utilities compile, defaults do not.
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./css/output.css', import.meta.url), 'utf8');
const must = ['.min-h-touch', '.bg-surface', '.text-text-muted', '.p-4', '.gap-6', '.rounded-md', '.shadow-overlay', '.t-display', '.text-body', '.font-display', '--color-accent'];
// Default palette, off-grid spacing and blur never compile. Arbitrary values ([17px]) and
// gradient directions still do in Tailwind; review_ui catches those in source code.
const mustNot = ['.bg-indigo-500', '.p-5', '.backdrop-blur-xl', '.from-purple-500', 'oklch('];
const missing = must.filter((c) => !css.includes(c));
const leaked = mustNot.filter((c) => css.includes(c));
if (missing.length || leaked.length) {
  console.error({ missing, leaked });
  process.exit(1);
}
console.log(`Tailwind theme OK: ${must.length} expected utilities present, ${mustNot.length} off-system utilities absent.`);
