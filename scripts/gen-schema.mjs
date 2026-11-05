// Writes src/schema/direction.schema.json from the zod schema (run after build).
import { writeFileSync } from 'node:fs';
import { directionJsonSchema } from '../dist/schema/direction.schema.js';

const out = new URL('../src/schema/direction.schema.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(directionJsonSchema(), null, 2)}\n`);
console.log(`wrote ${out.pathname}`);
