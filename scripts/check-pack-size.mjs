// Reports the npm package size and fails CI on large regressions.
// Limits are deliberately generous; tighten them as the package matures.
import { execSync } from 'node:child_process';

const MAX_PACKED_BYTES = 400 * 1024;
const MAX_UNPACKED_BYTES = 2 * 1024 * 1024;

const raw = execSync('npm pack --dry-run --json --ignore-scripts', { encoding: 'utf8' });
const [info] = JSON.parse(raw);
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

console.log(`package: ${info.name}@${info.version}`);
console.log(`files:    ${info.entryCount}`);
console.log(`packed:   ${kb(info.size)} (limit ${kb(MAX_PACKED_BYTES)})`);
console.log(`unpacked: ${kb(info.unpackedSize)} (limit ${kb(MAX_UNPACKED_BYTES)})`);

if (info.size > MAX_PACKED_BYTES || info.unpackedSize > MAX_UNPACKED_BYTES) {
  console.error('Package size limit exceeded.');
  process.exit(1);
}
