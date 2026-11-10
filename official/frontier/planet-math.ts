// The dual of a subdivided icosahedron: a closed world with twelve pentagons.
// Shared deterministic topology for rules, rendering and route planning.
export type V3 = readonly [number, number, number];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const multiply = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normal = (a: V3): V3 => multiply(a, 1 / Math.hypot(...a));
export const homeTiles = (size: number) => [
  size + 1,
  size * size - size - 2,
  size * 2 - 2,
  size * (size - 2) + 1,
];
