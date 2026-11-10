import { add, multiply, dot, cross, normal, homeTiles, type V3 } from './planet-math';
export function makePlanet(size: number, frequency: number) {
  const phi = (1 + Math.sqrt(5)) / 2;
  const base: V3[] = (
    [
      [-1, phi, 0],
      [1, phi, 0],
      [-1, -phi, 0],
      [1, -phi, 0],
      [0, -1, phi],
      [0, 1, phi],
      [0, -1, -phi],
      [0, 1, -phi],
      [phi, 0, -1],
      [phi, 0, 1],
      [-phi, 0, -1],
      [-phi, 0, 1],
    ] as V3[]
  ).map(normal);
  const faces = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  const points: V3[] = [],
    triangles: number[][] = [],
    unique = new Map<string, number>();
  const vertex = (p: V3) => {
    const n = normal(p),
      key = n.map((v) => Math.round(v * 1e7)).join(',');
    let id = unique.get(key);
    if (id === undefined) {
      id = points.length;
      unique.set(key, id);
      points.push(n);
    }
    return id;
  };
  for (const face of faces) {
    const a = base[face[0]],
      b = base[face[1]],
      c = base[face[2]],
      f = frequency;
    const indices = new Map<string, number>();
    for (let i = 0; i <= f; i++)
      for (let j = 0; j <= f - i; j++)
        indices.set(
          `${i},${j}`,
          vertex(add(add(multiply(a, (f - i - j) / f), multiply(b, i / f)), multiply(c, j / f))),
        );
    const at = (i: number, j: number) => indices.get(`${i},${j}`)!;
    for (let i = 0; i < f; i++)
      for (let j = 0; j < f - i; j++) {
        triangles.push([at(i, j), at(i + 1, j), at(i, j + 1)]);
        if (i + j < f - 1) triangles.push([at(i + 1, j), at(i + 1, j + 1), at(i, j + 1)]);
      }
  }
  // Keep existing player-home IDs while placing homes far apart on the sphere.
  const desired = homeTiles(size),
    chosen: number[] = [];
  for (let i = 0; i < 4; i++) {
    let best = -Infinity,
      found = 0;
    for (let id = 0; id < points.length; id++) {
      if (chosen.includes(id)) continue;
      const score = i
        ? Math.min(...chosen.map((j) => 1 - dot(points[id], points[j])))
        : 1 - Math.abs(points[id][1]);
      if (score > best) {
        best = score;
        found = id;
      }
    }
    chosen.push(found);
  }
  const order = points.map((_, i) => i);
  chosen.forEach((old, i) => {
    const at = order.indexOf(old);
    [order[desired[i]], order[at]] = [order[at], order[desired[i]]];
  });
  const remap = new Map(order.map((old, id) => [old, id]));
  const centers = order.map((old) => points[old]);
  const adjacency = centers.map(() => new Set<number>()),
    incident = centers.map(() => [] as number[]);
  const corners = triangles.map((triangle, index) => {
    const ids = triangle.map((old) => remap.get(old)!);
    for (const id of ids) {
      incident[id].push(index);
      for (const other of ids) if (other !== id) adjacency[id].add(other);
    }
    return normal(add(add(centers[ids[0]], centers[ids[1]]), centers[ids[2]]));
  });
  const cells = centers.map((center, id) => {
    const u = normal(cross(Math.abs(center[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0], center)),
      v = cross(center, u);
    const angle = (p: V3) => Math.atan2(dot(p, v), dot(p, u));
    return Object.freeze({
      center,
      corners: incident[id].sort((a, b) => angle(corners[a]) - angle(corners[b])),
      neighbors: [...adjacency[id]].sort((a, b) => angle(centers[a]) - angle(centers[b])),
    });
  });
  return Object.freeze({
    size,
    cells,
    corners,
    radius: Math.sqrt((cells.length * 9.38) / (4 * Math.PI)),
  });
}
