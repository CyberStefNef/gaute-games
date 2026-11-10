// Lossless GLB transport. Decompression runs inside the browser/WebView, before
// passing original bytes to either renderer. Hermes needs no compression module.
import { decodeBase64, MODEL_LIMITS, type ModelAsset } from './glb.mjs';
export async function unpackModel(model: ModelAsset): Promise<ModelAsset> {
  if (model.compression === undefined) return model;
  if (model.compression !== 'gzip') throw Error('Unsupported model compression');
  if (typeof DecompressionStream === 'undefined')
    throw Error('This WebView needs compression stream support');
  const packed = decodeBase64(model.data);
  const reader = new Blob([packed as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('gzip'))
    .getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MODEL_LIMITS.bytes) {
        await reader.cancel();
        throw Error('Decompressed model exceeds its size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  let binary = '';
  for (const chunk of chunks)
    for (let i = 0; i < chunk.length; i += 8192)
      binary += String.fromCharCode(...chunk.subarray(i, i + 8192));
  return { format: 'glb', data: btoa(binary) };
}
