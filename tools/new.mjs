// npm run new -- <slug>: copies template/ to official/<slug> and names it.
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { ROOT } from './games.mjs';

const slug = process.argv[2];
if (!slug || !/^[a-z][a-z0-9-]{1,39}$/.test(slug)) {
  console.error('Usage: npm run new -- my-game   (lowercase letters, digits and dashes)');
  process.exit(1);
}
const target = path.join(ROOT, 'official', slug);
if (existsSync(target)) {
  console.error(`official/${slug} already exists.`);
  process.exit(1);
}
cpSync(path.join(ROOT, 'template'), target, { recursive: true });
const manifest = path.join(target, 'manifest.json');
writeFileSync(manifest, readFileSync(manifest, 'utf8').replace('"my-game"', JSON.stringify(slug)));
console.log(`Created official/${slug}. Run "vp dev" and pick it in the simulator.`);
