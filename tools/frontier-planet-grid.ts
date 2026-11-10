// Regenerate immutable planetary geometry outside the game sandbox's CPU budget.
import { writeFileSync } from 'node:fs';
import { makePlanet } from '../official/frontier/planet-build';
const result = Object.fromEntries(
  ([8, 12, 16, 24] as const).map((size, i) => {
    const p = makePlanet(size, [3, 4, 5, 8][i]);
    return [
      size,
      {
        radius: p.radius,
        corners: p.corners,
        cells: p.cells.map((c) => [c.center, c.neighbors, c.corners]),
      },
    ];
  }),
);
writeFileSync(
  new URL('../official/frontier/planet-data.json', import.meta.url),
  JSON.stringify(result, (_key, value) =>
    typeof value === 'number' && !Number.isInteger(value) ? Math.round(value * 1e6) / 1e6 : value,
  ) + '\n',
);

writeFileSync(
  new URL('../official/frontier/planet-neighbors.json', import.meta.url),
  JSON.stringify(
    Object.fromEntries(
      Object.entries(result).map(([size, p]) => [size, p.cells.map((cell) => cell[1])]),
    ),
  ) + '\n',
);
