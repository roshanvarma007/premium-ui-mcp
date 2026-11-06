// Writes the contributor-facing JSON Schemas from the zod schemas (run after build).
import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { BlueprintSchema } from '../dist/schema/blueprint.schema.js';
import { directionJsonSchema } from '../dist/schema/direction.schema.js';

const write = (name, schema) => {
  const out = new URL(`../src/schema/${name}`, import.meta.url);
  writeFileSync(out, `${JSON.stringify(schema, null, 2)}\n`);
  console.log(`wrote src/schema/${name}`);
};
write('direction.schema.json', directionJsonSchema());
write(
  'blueprint.schema.json',
  z.toJSONSchema(BlueprintSchema, { target: 'draft-2020-12', io: 'input' }),
);
