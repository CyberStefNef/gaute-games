export const MODEL_LIMITS: Readonly<{
  bytes: number;
  models: number;
  nodes: number;
  vertices: number;
  indices: number;
  texturePixels: number;
}>;
export type ModelAsset = {
  readonly format: 'glb';
  readonly data: string;
  readonly compression?: 'gzip';
};
export type GlbDocument = {
  json: {
    bufferViews?: { buffer: number; byteOffset?: number; byteLength: number }[];
    textures?: { source: number; sampler?: number }[];
    images?: { bufferView: number; mimeType: string }[];
    samplers?: { magFilter?: number; minFilter?: number; wrapS?: number; wrapT?: number }[];
  };
  text: string;
  bin: Uint8Array;
  texturePixels: number;
};
export function decodeBase64(data: string): Uint8Array;
export function inspectGLB(input: Uint8Array | ArrayBuffer): GlbDocument;
