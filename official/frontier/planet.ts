import data from './planet-data.json';
import { normal, dot, type V3 } from './planet-math';
export * from './planet-math';
type Packed = { radius: number; corners: V3[]; cells: [V3, number[], number[]][] };
const PLANETS = Object.fromEntries(
  Object.entries(data as unknown as Record<string, Packed>).map(([size, p]) => [
    size,
    Object.freeze({
      size: Number(size),
      radius: p.radius,
      corners: p.corners,
      cells: p.cells.map(([center, neighbors, corners]) => ({ center, neighbors, corners })),
    }),
  ]),
);
export function planet(size: number) {
  return PLANETS[String(size)] ?? PLANETS[12];
}
export function distancesFrom(at: number, size: number, max = Infinity) {
  const cells = planet(size).cells,
    result = Array.from({ length: cells.length }, () => Infinity);
  if (!cells[at]) return result;
  result[at] = 0;
  const queue = [at];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (result[id] >= max) continue;
    for (const near of cells[id].neighbors)
      if (result[near] === Infinity) {
        result[near] = result[id] + 1;
        queue.push(near);
      }
  }
  return result;
}
export function nearTiles(at: number, size: number, range: number) {
  const cells = planet(size).cells;
  if (!cells[at]) return [];
  const seen = new Set([at]);
  let edge = [at];
  for (let step = 0; step < range; step++) {
    const next: number[] = [];
    for (const id of edge)
      for (const near of cells[id].neighbors)
        if (!seen.has(near)) {
          seen.add(near);
          next.push(near);
        }
    edge = next;
  }
  return [...seen];
}
export function nearestTile(point: V3, size: number) {
  const p = normal(point);
  let best = -Infinity,
    found = 0;
  planet(size).cells.forEach((cell, id) => {
    const d = dot(p, cell.center);
    if (d > best) {
      best = d;
      found = id;
    }
  });
  return found;
}
