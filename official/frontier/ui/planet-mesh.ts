// Planet terrain is new geometry. The approved Blender props remain unchanged.
import type { ModelAsset } from '@gaute/games-sdk/scene3d';
import { planet, add, multiply, normal, type V3 } from '../planet';
import type { BrewView } from './contract';
import type { BoardMarks } from './board';
export const base64 = (data: Uint8Array) => {
  let binary = '';
  for (let i = 0; i < data.length; i += 8192)
    binary += String.fromCharCode(...data.subarray(i, i + 8192));
  return btoa(binary);
};
const palette = ['#94aa74', '#7f9c65', '#7f9c65', '#4e969d', '#7f9c65', '#a5a487'];
function rgba(hex: string, shade = 1) {
  return [0, 2, 4]
    .map((i) => {
      const s = parseInt(hex.slice(i + 1, i + 3), 16) / 255;
      return Math.round(
        Math.min(1, (s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4) * shade) * 255,
      );
    })
    .concat(255);
}
export function planetColors(
  brew: Pick<BrewView, 'size' | 'ground' | 'visible'>,
  marks: BoardMarks,
) {
  const data: number[] = [];
  for (const [at, cell] of planet(brew.size).cells.entries()) {
    const ground = brew.ground[at];
    let color = palette[ground] ?? '#e1e8eb';
    if (marks.selected === at || marks.courierAt === at) color = '#d8b8e8';
    else if (marks.pending?.at === at) color = '#e5ba5b';
    else if (marks.siege.has(at)) color = '#ce7679';
    else if (marks.gather.has(at)) color = '#c6b36d';
    else if (marks.reach.has(at)) color = '#9ebc92';
    const shade = ground >= 0 && !brew.visible.has(at) ? 0.64 : 1;
    const top = rgba(color, shade),
      side = ground < 0 ? rgba('#c7d3db') : rgba('#786449', shade);
    for (let i = 0; i < cell.corners.length + 1; i++) data.push(...top);
    for (let i = 0; i < cell.corners.length; i++) data.push(...side);
  }
  return new Uint8Array(data);
}
export function planetModel(
  brew: Pick<BrewView, 'size' | 'ground' | 'visible'>,
  marks: BoardMarks,
): ModelAsset {
  const grid = planet(brew.size),
    positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [];
  const point = (p: V3, n: V3) => {
    positions.push(...p);
    normals.push(...n.map((v) => Math.round(v * 127)), 0);
  };
  for (const cell of grid.cells) {
    const start = positions.length / 3,
      count = cell.corners.length;
    point(multiply(cell.center, grid.radius), cell.center);
    for (const index of cell.corners) {
      const corner = normal(
        add(multiply(grid.corners[index], 0.975), multiply(cell.center, 0.025)),
      );
      point(multiply(corner, grid.radius), cell.center);
    }
    for (const index of cell.corners)
      point(multiply(grid.corners[index], grid.radius - 0.18), cell.center);
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      indices.push(start, start + 1 + i, start + 1 + next);
      indices.push(
        start + 1 + i,
        start + 1 + count + i,
        start + 1 + count + next,
        start + 1 + i,
        start + 1 + count + next,
        start + 1 + next,
      );
    }
  }
  return coloredModel(positions, normals, indices, planetColors(brew, marks), grid.radius);
}
export function coloredModel(
  positions: number[],
  normals: number[],
  indices: number[],
  colors: Uint8Array,
  radius: number,
  fog = false,
): ModelAsset {
  const p = new Float32Array(positions),
    n = new Int8Array(normals),
    ix = new Uint16Array(indices);
  const arrays = [
    new Uint8Array(p.buffer),
    new Uint8Array(n.buffer),
    colors,
    new Uint8Array(ix.buffer),
  ];
  const views: {
    buffer: number;
    byteOffset: number;
    byteLength: number;
    byteStride?: number;
    target: number;
  }[] = [];
  let length = 0;
  for (const [i, bytes] of arrays.entries()) {
    length = Math.ceil(length / 4) * 4;
    views.push({
      buffer: 0,
      byteOffset: length,
      byteLength: bytes.length,
      target: i === 3 ? 34963 : 34962,
      ...(i === 1 ? { byteStride: 4 } : {}),
    });
    length += bytes.length;
  }
  const binary = new Uint8Array(Math.ceil(length / 4) * 4);
  arrays.forEach((a, i) => binary.set(a, views[i].byteOffset));
  const r = radius;
  const json = {
    asset: { version: '2.0', generator: 'Gaute planet terrain' },
    extensionsUsed: ['KHR_mesh_quantization'],
    extensionsRequired: ['KHR_mesh_quantization'],
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: views,
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: p.length / 3,
        type: 'VEC3',
        min: [-r, -r, -r],
        max: [r, r, r],
      },
      { bufferView: 1, componentType: 5120, normalized: true, count: p.length / 3, type: 'VEC3' },
      { bufferView: 2, componentType: 5121, normalized: true, count: p.length / 3, type: 'VEC4' },
      { bufferView: 3, componentType: 5123, count: ix.length, type: 'SCALAR' },
    ],
    materials: [
      {
        ...(fog
          ? {
              alphaMode: 'BLEND',
              emissiveFactor: [0.2, 0.23, 0.26],
              extras: { castShadow: false },
            }
          : {}),
        pbrMetallicRoughness: {
          baseColorFactor: [1, 1, 1, 1],
          metallicFactor: 0,
          roughnessFactor: 0.82,
        },
      },
    ],
    meshes: [
      {
        primitives: [
          { attributes: { POSITION: 0, NORMAL: 1, COLOR_0: 2 }, indices: 3, material: 0 },
        ],
      },
    ],
  };
  const text = new TextEncoder().encode(JSON.stringify(json)),
    jl = Math.ceil(text.length / 4) * 4;
  const bytes = new Uint8Array(28 + jl + binary.length),
    view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, bytes.length, true);
  view.setUint32(12, jl, true);
  view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(32, 20, 20 + jl);
  bytes.set(text, 20);
  view.setUint32(20 + jl, binary.length, true);
  view.setUint32(24 + jl, 0x004e4942, true);
  bytes.set(binary, 28 + jl);
  return { format: 'glb', data: base64(bytes) };
}
