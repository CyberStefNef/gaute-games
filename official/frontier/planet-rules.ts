// The sandbox needs connectivity, not render geometry or cloud coordinates.
import data from './planet-neighbors.json';
export { homeTiles } from './planet-math';
export function graph(size: number): readonly (readonly number[])[] {
  return data[String(size) as keyof typeof data] ?? data['12'];
}
export function adjacent(at: number, size: number) {
  return graph(size)[at] ?? [];
}
export function distancesFrom(at: number, size: number, max = Infinity) {
  const cells = graph(size),
    result = Array.from({ length: cells.length }, () => Infinity);
  if (!cells[at]) return result;
  result[at] = 0;
  const queue = [at];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    if (result[id] >= max) continue;
    for (const near of cells[id])
      if (result[near] === Infinity) {
        result[near] = result[id] + 1;
        queue.push(near);
      }
  }
  return result;
}
export function nearTiles(at: number, size: number, range: number) {
  const cells = graph(size);
  if (!cells[at]) return [];
  const seen = new Set([at]);
  let edge = [at];
  for (let step = 0; step < range; step++) {
    const next: number[] = [];
    for (const id of edge)
      for (const near of cells[id])
        if (!seen.has(near)) {
          seen.add(near);
          next.push(near);
        }
    edge = next;
  }
  return [...seen];
}
