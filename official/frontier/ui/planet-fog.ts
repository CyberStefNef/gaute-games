// A connected canopy, rather than separate cloud objects on individual tiles.
import { planet, normal, add, multiply, dot, type V3 } from '../planet';
import type { BrewView } from './contract';
import { coloredModel } from './planet-mesh';
type Sample = readonly (readonly [number, number])[];
export function makeFog(brew: Pick<BrewView, 'size' | 'ground'>) {
  const grid = planet(brew.size),
    positions: number[] = [],
    normals: number[] = [],
    indices: number[] = [],
    samples: Sample[] = [],
    unique = new Map<string, number>();
  const corners = grid.corners.map(() => [] as number[]);
  grid.cells.forEach((cell, at) => cell.corners.forEach((c) => corners[c].push(at)));
  const vertex = (unit: V3, sample: Sample) => {
    const n = normal(unit),
      key = n.map((v) => Math.round(v * 1e6)).join(',');
    const old = unique.get(key);
    if (old !== undefined) return old;
    const p = multiply(n, grid.radius),
      epsilon = 0.06;
    const nearby = new Set(sample.flatMap(([at]) => [at, ...grid.cells[at].neighbors]));
    const bubbles = [...nearby].map((at) => ({
      center: multiply(grid.cells[at].center, grid.radius),
      height: 0.68 + ((at * 17) % 13) * 0.018,
    }));
    const noise = (point: V3) =>
      0.23 +
      bubbles.reduce((height, b) => {
        const dx = point[0] - b.center[0],
          dy = point[1] - b.center[1],
          dz = point[2] - b.center[2];
        return height + b.height * Math.exp(-(dx * dx + dy * dy + dz * dz) / 1.6);
      }, 0);
    const gradient: V3 = [0, 1, 2].map((axis) => {
      const a = [...p] as [number, number, number],
        b = [...p] as [number, number, number];
      a[axis] += epsilon;
      b[axis] -= epsilon;
      return (noise(a) - noise(b)) / (2 * epsilon);
    }) as [number, number, number];
    const tangent = add(gradient, multiply(n, -dot(gradient, n))),
      shading = normal(add(n, multiply(tangent, -1)));
    positions.push(...multiply(n, grid.radius + noise(p)));
    normals.push(...shading.map((v) => Math.round(v * 127)), 0);
    const id = samples.length;
    samples.push(sample);
    unique.set(key, id);
    return id;
  };
  const average = (a: Sample, b: Sample): Sample => {
    const weights = new Map<number, number>();
    for (const [at, w] of [...a, ...b]) weights.set(at, (weights.get(at) ?? 0) + w / 2);
    return [...weights];
  };
  const triangle = (
    a: V3,
    b: V3,
    c: V3,
    sa: Sample,
    sb: Sample,
    sc: Sample,
    depth: number,
  ): void => {
    if (!depth) {
      indices.push(vertex(a, sa), vertex(b, sb), vertex(c, sc));
      return;
    }
    const ab = normal(add(a, b)),
      bc = normal(add(b, c)),
      ac = normal(add(a, c)),
      sab = average(sa, sb),
      sbc = average(sb, sc),
      sac = average(sa, sc);
    triangle(a, ab, ac, sa, sab, sac, depth - 1);
    triangle(ab, b, bc, sab, sb, sbc, depth - 1);
    triangle(ac, bc, c, sac, sbc, sc, depth - 1);
    triangle(ab, bc, ac, sab, sbc, sac, depth - 1);
  };
  for (const [at, cell] of grid.cells.entries())
    for (let i = 0; i < cell.corners.length; i++) {
      const ca = cell.corners[i],
        cb = cell.corners[(i + 1) % cell.corners.length];
      const a = cell.center,
        b = grid.corners[ca],
        c = grid.corners[cb];
      const sa: Sample = [[at, 1]],
        sb: Sample = corners[ca].map((id) => [id, 1 / corners[ca].length]),
        sc: Sample = corners[cb].map((id) => [id, 1 / corners[cb].length]);
      triangle(a, b, c, sa, sb, sc, 2);
    }
  const colors = (ground: readonly number[]) =>
    new Uint8Array(
      samples.flatMap((sample) => {
        const unknown = sample.reduce((sum, [at, w]) => sum + (ground[at] < 0 ? w : 0), 0);
        const alpha = Math.max(0, Math.min(1, (unknown - 0.15) / 0.7));
        return [235, 242, 248, Math.round(alpha * 255)];
      }),
    );
  return {
    asset: coloredModel(positions, normals, indices, colors(brew.ground), grid.radius + 1.5, true),
    colors,
  };
}
