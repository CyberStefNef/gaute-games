// Flat-top tabletop matching the Blender camera. Rule rows become screen
// columns, preserving the rules’ odd-row adjacency without changing cell IDs.

/** Hex circumradius in world pixels at zoom 1. */
export const R = 46;
/** Vertical squash for the tabletop tilt. */
export const TILT = 0.5;
export const HEX_W = 2 * R;
export const ROW_STEP = Math.sqrt(3) * R * TILT;
/** Slab thickness drawn under each tile. */
export const SLAB = 9;
/** Headroom above the back row for tall props, banners and badges. */
export const TOP = 70;
export const SIDE = 24;
export const BOTTOM = 36;
/** Below this zoom a hex is smaller than a 44 px target: taps zoom in instead. */
export const PICK_ZOOM = 0.62;
export const MAX_ZOOM = 2.2;

export const cell = (at: number, size: number) => ({ x: at % size, y: Math.floor(at / size) });

export const worldSize = (size: number) => ({
  width: HEX_W * (1 + (size - 1) * 0.75) + SIDE * 2,
  height: TOP + (size + 0.5) * ROW_STEP + SLAB + BOTTOM,
});

/** Centre of the tile's top face in world pixels. */
export function center(at: number, size: number) {
  const { x, y } = cell(at, size);
  return {
    x: SIDE + R + y * HEX_W * 0.75,
    y: TOP + ROW_STEP * (x + 0.5 + (y & 1) * 0.5),
  };
}

/** The tile under a world point, or null outside the board. Exact for hexes. */
export function pick(px: number, py: number, size: number) {
  const row = Math.round((px - SIDE - R) / (HEX_W * 0.75));
  let best: number | null = null,
    bestDistance = Infinity;
  for (let y = row - 1; y <= row + 1; y++) {
    if (y < 0 || y >= size) continue;
    const column = Math.round((py - TOP) / ROW_STEP - 0.5 - (y & 1) * 0.5);
    for (let x = column - 1; x <= column + 1; x++) {
      if (x < 0 || x >= size) continue;
      const c = center(y * size + x, size);
      // Nearest centre in un-tilted space is the hex Voronoi cell.
      const d = (px - c.x) ** 2 + ((py - c.y) / TILT) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = y * size + x;
      }
    }
  }
  return best !== null && bestDistance <= R * R * 1.02 ? best : null;
}

const ANGLES = [180, 120, 60, 0, -60, -120].map((deg) => (deg * Math.PI) / 180);

/** Corners follow rule edge order: left, lower left, lower right, right, upper right, upper left. */
export function hexCorners(cx: number, cy: number, inset = 0) {
  const r = R - inset;
  return ANGLES.map((a) => [cx + r * Math.cos(a), cy + r * Math.sin(a) * TILT] as const);
}

export const points = (list: readonly (readonly [number, number])[]) =>
  list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

export const hexPoints = (cx: number, cy: number, inset = 0) => points(hexCorners(cx, cy, inset));

/**
 * The neighbour across each edge, in corner order: edge i joins corner i and i+1
 * (NE, E, SE, SW, W, NW). Returns -1 off the board.
 */
export function across(at: number, size: number, edge: number) {
  const { x, y } = cell(at, size);
  const odd = y & 1;
  const steps = [
    [odd, -1],
    [1, 0],
    [odd, 1],
    [odd - 1, 1],
    [-1, 0],
    [odd - 1, -1],
  ] as const;
  const nx = x + steps[edge][0],
    ny = y + steps[edge][1];
  return nx < 0 || ny < 0 || nx >= size || ny >= size ? -1 : ny * size + nx;
}

export const hexNeighbours = (at: number, size: number) =>
  [0, 1, 2, 3, 4, 5].map((edge) => across(at, size, edge)).filter((near) => near >= 0);

/** Hex distance between two odd-r cells. */
export function hexDistance(a: number, b: number, size: number) {
  const cube = (at: number) => {
    const { x, y } = cell(at, size);
    const q = x - (y - (y & 1)) / 2;
    return [q, y, -q - y] as const;
  };
  const [aq, ar, as] = cube(a),
    [bq, br, bs] = cube(b);
  return Math.max(Math.abs(aq - bq), Math.abs(ar - br), Math.abs(as - bs));
}

/** Stable per-tile noise in [0, 1) for decoration variants. */
export function hash(at: number, salt = 0) {
  let h = (at + 1) * 374761393 + salt * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
