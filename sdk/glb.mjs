// A bounded, self-contained GLB subset for host-owned renderers. No URL loading.
export const MODEL_LIMITS = Object.freeze({
  bytes: 1024 * 1024,
  models: 32,
  nodes: 1024,
  vertices: 100000,
  indices: 600000,
  texturePixels: 4 * 1024 * 1024,
});
const object = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const integer = (v, max) => Number.isSafeInteger(v) && v >= 0 && v <= max;
const fail = (reason) => {
  throw Error(`GLB: ${reason}`);
};
export function decodeBase64(data) {
  if (
    typeof data !== 'string' ||
    data.length > Math.ceil(MODEL_LIMITS.bytes / 3) * 4 ||
    data.length % 4 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)
  )
    fail('invalid or oversized base64');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const out = new Uint8Array(
    (data.length / 4) * 3 - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0),
  );
  let at = 0;
  for (let i = 0; i < data.length; i += 4) {
    const n =
      (chars.indexOf(data[i]) << 18) |
      (chars.indexOf(data[i + 1]) << 12) |
      (Math.max(0, chars.indexOf(data[i + 2])) << 6) |
      Math.max(0, chars.indexOf(data[i + 3]));
    if (at < out.length) out[at++] = n >> 16;
    if (at < out.length) out[at++] = n >> 8;
    if (at < out.length) out[at++] = n;
  }
  return out;
}
export function inspectGLB(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length < 28 || bytes.length > MODEL_LIMITS.bytes) fail('invalid file size');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (
    view.getUint32(0, true) !== 0x46546c67 ||
    view.getUint32(4, true) !== 2 ||
    view.getUint32(8, true) !== bytes.length
  )
    fail('expected a complete glTF 2 GLB');
  let json,
    text,
    bin = new Uint8Array(),
    offset = 12;
  while (offset < bytes.length) {
    if (offset + 8 > bytes.length) fail('truncated chunk');
    const length = view.getUint32(offset, true),
      type = view.getUint32(offset + 4, true);
    offset += 8;
    if (length % 4 || offset + length > bytes.length) fail('invalid chunk length');
    const chunk = bytes.subarray(offset, offset + length);
    if (type === 0x4e4f534a && !json && offset === 20) {
      try {
        text = decodeURIComponent(
          Array.from(chunk, (b) => '%' + b.toString(16).padStart(2, '0')).join(''),
        );
        json = JSON.parse(text);
      } catch {
        fail('invalid UTF-8 JSON');
      }
    } else if (type === 0x004e4942 && bin.length === 0) bin = chunk;
    else fail('unsupported or repeated chunk');
    offset += length;
  }
  if (
    !object(json) ||
    json.asset?.version !== '2.0' ||
    !Array.isArray(json.buffers) ||
    json.buffers.length !== 1 ||
    json.buffers[0].uri !== undefined ||
    !integer(json.buffers[0].byteLength, bin.length) ||
    bin.length - json.buffers[0].byteLength > 3
  )
    fail('embed one binary buffer');
  const supported = new Set([
    'KHR_materials_unlit',
    'KHR_texture_transform',
    'KHR_mesh_quantization',
  ]);
  if ((json.extensionsRequired ?? []).some((e) => !supported.has(e)))
    fail('unsupported required extension; export uncompressed geometry and PNG/JPEG textures');
  const scanExtensions = (value, depth = 0) => {
    if (depth > 64) fail('JSON nesting too deep');
    if (!value || typeof value !== 'object') return;
    if (value.extensions && Object.keys(value.extensions).some((name) => !supported.has(name)))
      fail('unsupported model extension');
    for (const child of Object.values(value)) scanExtensions(child, depth + 1);
  };
  scanExtensions(json);
  if ((json.materials?.length ?? 0) > 64 || (json.textures?.length ?? 0) > 64)
    fail('too many materials or textures');
  for (const key of [
    'bufferViews',
    'accessors',
    'meshes',
    'nodes',
    'materials',
    'images',
    'textures',
    'animations',
    'skins',
  ])
    if (json[key] !== undefined && (!Array.isArray(json[key]) || json[key].length > 1024))
      fail(`too many ${key}`);
  for (const b of json.bufferViews ?? [])
    if (
      !object(b) ||
      b.buffer !== 0 ||
      !integer(b.byteOffset ?? 0, bin.length) ||
      !integer(b.byteLength, bin.length - (b.byteOffset ?? 0))
    )
      fail('buffer view outside binary data');
  const indexAccessors = new Set(
    (Array.isArray(json.meshes) ? json.meshes : []).flatMap((m) =>
      (Array.isArray(m.primitives) ? m.primitives : []).flatMap((p) =>
        Number.isSafeInteger(p.indices) ? [p.indices] : [],
      ),
    ),
  );
  let vertices = 0;
  for (const [index, a] of (json.accessors ?? []).entries()) {
    const maxCount =
      indexAccessors.has(index) && object(a) && a.type === 'SCALAR'
        ? MODEL_LIMITS.indices
        : MODEL_LIMITS.vertices;
    if (!object(a) || !integer(a.count, maxCount)) fail('invalid accessor');
    if (a.type === 'VEC3') vertices += a.count;
  }
  if (vertices > MODEL_LIMITS.vertices) fail('too many vertex attributes');
  const nodes = json.nodes ?? [];
  const visited = new Set(),
    parents = new Set();
  const walk = (index, trail = new Set()) => {
    if (!integer(index, nodes.length - 1) || trail.has(index))
      fail('invalid or cyclic node hierarchy');
    if (trail.size > 64) fail('node hierarchy too deep');
    if (visited.has(index)) return;
    visited.add(index);
    const next = new Set(trail).add(index);
    for (const child of nodes[index].children ?? []) {
      if (parents.has(child)) fail('node has multiple parents');
      parents.add(child);
      walk(child, next);
    }
  };
  nodes.forEach((_, i) => walk(i));
  let pixels = 0;
  const imagePixels = [];
  for (const image of json.images ?? []) {
    if (
      image.uri !== undefined ||
      !integer(image.bufferView, (json.bufferViews?.length ?? 0) - 1) ||
      !['image/png', 'image/jpeg'].includes(image.mimeType)
    )
      fail('embed PNG or JPEG images');
    const b = json.bufferViews[image.bufferView],
      data = bin.subarray(b.byteOffset ?? 0, (b.byteOffset ?? 0) + b.byteLength);
    let width = 0,
      height = 0;
    if (image.mimeType === 'image/png' && data.length >= 24 && data[0] === 137 && data[1] === 80) {
      const d = new DataView(data.buffer, data.byteOffset, data.byteLength);
      width = d.getUint32(16);
      height = d.getUint32(20);
    }
    if (image.mimeType === 'image/jpeg' && data[0] === 255 && data[1] === 216) {
      let p = 2;
      while (p + 8 < data.length) {
        if (data[p] !== 255) break;
        const marker = data[p + 1],
          length = data[p + 2] * 256 + data[p + 3];
        if (length < 2) break;
        if ([192, 193, 194].includes(marker)) {
          height = data[p + 5] * 256 + data[p + 6];
          width = data[p + 7] * 256 + data[p + 8];
          break;
        }
        p += length + 2;
      }
    }
    if (!width || !height || width > 2048 || height > 2048) fail('invalid or oversized texture');
    pixels += width * height;
    imagePixels.push(width * height);
  }
  let referencedPixels = 0;
  const countTextures = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (
        key.endsWith('Texture') &&
        object(child) &&
        integer(child.index, (json.textures?.length ?? 0) - 1)
      )
        referencedPixels += imagePixels[json.textures[child.index].source] ?? 0;
      else if (key !== 'extras') countTextures(child);
    }
  };
  for (const material of json.materials ?? []) countTextures(material);
  pixels = Math.max(pixels, referencedPixels);
  if (pixels > MODEL_LIMITS.texturePixels) fail('too many texture pixels');
  return { json, text, bin, texturePixels: pixels };
}
