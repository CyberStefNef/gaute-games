import { gzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { inspectGLB } from '../sdk/glb.mjs';
/** Explicit .glb imports become offline model values, never network URLs. */
export function modelAssets() {
  return {
    name: 'gaute-model-assets',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith('.glb')) return;
      const bytes = readFileSync(id);
      inspectGLB(bytes);
      const packed = gzipSync(bytes, { level: 9 });
      return `export default {format:'glb',compression:'gzip',data:${JSON.stringify(packed.toString('base64'))}};`;
    },
  };
}
