// Parses every generated stylesheet with Lightning CSS (strict, no error recovery).
import { readdirSync, readFileSync } from 'node:fs';
import { transform } from 'lightningcss';

const dirs = ['css', '../web-sample/css'];
let count = 0;
for (const dir of dirs) {
  for (const name of readdirSync(new URL(`./${dir}/`, import.meta.url))) {
    if (!name.endsWith('.css') || name === 'output.css' || name === 'tailwind.css') continue;
    const code = readFileSync(new URL(`./${dir}/${name}`, import.meta.url));
    transform({ filename: `${dir}/${name}`, code, errorRecovery: false });
    count++;
  }
}
console.log(`Lightning CSS parsed ${count} generated stylesheets without errors.`);
