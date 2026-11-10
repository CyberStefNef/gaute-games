import { expect, test } from 'vite-plus/test';
import { planet, homeTiles, distancesFrom, dot } from '../official/frontier/planet';
import { makePlanet } from '../official/frontier/planet-build';
import { neighbors, distance } from '../official/frontier/model';
test('planet districts form a closed reciprocal grid with exactly twelve pentagons', () => {
  for (const [i, size] of [8, 12, 16, 24].entries()) {
    const p = planet(size);
    expect(p.cells).toHaveLength([92, 162, 252, 642][i]);
    expect(p.cells.filter((c) => c.neighbors.length === 5)).toHaveLength(12);
    let edges = 0;
    for (const [at, c] of p.cells.entries()) {
      expect([5, 6]).toContain(c.neighbors.length);
      expect(c.corners).toHaveLength(c.neighbors.length);
      edges += c.neighbors.length;
      for (const n of neighbors(at, size)) {
        expect(neighbors(n, size)).toContain(at);
        expect(distance(at, n, size)).toBe(1);
      }
    }
    expect(p.cells.length - edges / 2 + p.corners.length).toBe(2);
    expect(distancesFrom(0, size).every(Number.isFinite)).toBe(true);
    const homes = homeTiles(size);
    for (let a = 0; a < 4; a++)
      for (let b = a + 1; b < 4; b++)
        expect(dot(p.cells[homes[a]].center, p.cells[homes[b]].center)).toBeLessThan(0.25);
  }
});
test('generated topology matches the pure builder without running the builder in each game action', () => {
  for (const [i, size] of [8, 12, 16, 24].entries()) {
    const actual = planet(size),
      expected = makePlanet(size, [3, 4, 5, 8][i]);
    expect(actual.cells.map((c) => c.neighbors)).toEqual(expected.cells.map((c) => c.neighbors));
    expect(actual.cells.map((c) => c.corners)).toEqual(expected.cells.map((c) => c.corners));
  }
});
