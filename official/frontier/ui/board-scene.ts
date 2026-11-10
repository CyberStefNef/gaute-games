import type { SceneCamera, SceneNode, Vec3 } from '@gaute/games-sdk/scene3d';
import { planet, multiply, add, cross, dot, normal, type V3 } from '../planet';
import type { BrewView, CourierKind } from './contract';
import type { Owners } from './derived';
import type { BoardMarks } from './board';
import type { ModelName } from './models';
// Keep the focused district under the lens while showing the original props'
// walls and silhouettes. At overview distance return to a centred globe.
export function boardCamera(n: Vec3, radius: number, span: number, fullSpan: number): SceneCamera {
  const blend = Math.max(0, Math.min(1, (span - 17) / Math.max(1, fullSpan - 17))),
    // The renderer uses world Y as camera up. A fixed southward tilt crosses
    // that axis at latitude -38°, flipping lookAt by 180°. Ease the tilt down
    // near the south pole so the sightline stays on the same side of world up.
    latitude = Math.asin(Math.max(-1, Math.min(1, n[1]))),
    tilt = Math.min((52 * Math.PI) / 180, Math.max(0, (Math.PI / 2 + latitude) * 0.8)),
    elevation = Math.PI / 2 - tilt * (1 - blend),
    right = Math.abs(n[1]) > 0.999999 ? ([1, 0, 0] as const) : normal(cross([0, 1, 0], n)),
    north = cross(n, right),
    eye = add(multiply(n, Math.sin(elevation)), multiply(north, -Math.cos(elevation))),
    up = normal(cross(eye, right)),
    target = add(multiply(n, (radius + 0.5) * (1 - blend)), multiply(up, -3 * (1 - blend)));
  return {
    position: add(target, multiply(eye, radius + 50)),
    target,
    projection: 'orthographic',
    span,
  };
}
export function tilePosition(at: number, size: number): Vec3 {
  return multiply(planet(size).cells[at]?.center ?? [0, 1, 0], planet(size).radius);
}
function orientation(at: number, size: number) {
  const n = planet(size).cells[at]?.center ?? [0, 1, 0];
  const raw = n[1] < -0.99999 ? [1, 0, 0, 0] : [n[2], 0, -n[0], 1 + n[1]];
  const length = Math.hypot(...raw);
  return raw.map((v) => v / length) as [number, number, number, number];
}
export function surfaceRotation(at: number, size: number): Vec3 {
  const [x, y, z, w] = orientation(at, size),
    m13 = 2 * (x * z + y * w),
    ry = Math.asin(Math.max(-1, Math.min(1, m13)));
  return Math.abs(m13) < 0.999999
    ? [
        Math.atan2(-2 * (y * z - x * w), 1 - 2 * (x * x + y * y)),
        ry,
        Math.atan2(-2 * (x * y - z * w), 1 - 2 * (y * y + z * z)),
      ]
    : [Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z)), ry, 0];
}
export function surfacePosition(at: number, size: number, offset: Vec3 = [0, 0, 0]): Vec3 {
  const [x, y, z, w] = orientation(at, size),
    q: V3 = [x, y, z],
    twice = multiply(cross(q, offset), 2);
  return add(tilePosition(at, size), add(offset, add(multiply(twice, w), cross(q, twice))));
}
// The terrain is a triangle fan below the district's tangent plane. Find the
// actual ground height under a local offset, rather than floating on that plane.
function groundHeight(at: number, size: number, x: number, z: number) {
  const grid = planet(size),
    cell = grid.cells[at],
    base = tilePosition(at, size),
    axisX = add(surfacePosition(at, size, [1, 0, 0]), multiply(base, -1)),
    axisZ = add(surfacePosition(at, size, [0, 0, 1]), multiply(base, -1)),
    corners = cell.corners.map((i) => {
      const p = add(
        multiply(
          normal(add(multiply(grid.corners[i], 0.975), multiply(cell.center, 0.025))),
          grid.radius,
        ),
        multiply(base, -1),
      );
      return [dot(p, axisX), dot(p, axisZ), dot(p, cell.center)];
    });
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i],
      b = corners[(i + 1) % corners.length],
      determinant = a[0] * b[1] - a[1] * b[0],
      u = (x * b[1] - z * b[0]) / determinant,
      v = (a[0] * z - a[1] * x) / determinant;
    if (u >= -0.0001 && v >= -0.0001 && u + v <= 1.0001) return u * a[2] + v * b[2];
  }
  return 0;
}
const groundModels: readonly ModelName[] = [
  'barleyMeadow',
  'hopGrove',
  'hill',
  'water',
  'woodland',
  'meadow',
];
const makers: Record<CourierKind, ModelName> = {
  walker: 'brewer',
  bike: 'cargoBike',
  cargo: 'deliveryCart',
};
export function boardScene(
  brew: BrewView,
  marks: BoardMarks,
  owner: Owners,
  paths?: ReadonlyMap<number, readonly number[]>,
  direction?: Vec3,
) {
  const grid = planet(brew.size),
    nodes: SceneNode[] = [
      { id: 'planet', model: 'planet', position: [0, 0, 0] },
      { id: 'fog', model: 'fog', position: [0, 0, 0] },
    ],
    tiles = new Map<string, number>();
  const front = (at: number) => !direction || dot(grid.cells[at].center, direction) > -0.2;
  const addNode = (
    id: string,
    model: ModelName,
    at: number,
    extra: Partial<SceneNode> = {},
    offset: Vec3 = [0, 0, 0],
  ) => {
    if (!front(at)) return;
    const floating = model === 'incident',
      // Seat broad rigid props into the fan. The small overlap is a foundation,
      // not a new slab. Owner outlines stay at the same seated height.
      footprint =
        model === 'route'
          ? 0
          : model === 'brewer'
            ? 0.25
            : model === 'cargoBike' || model === 'deliveryCart'
              ? 0.8
              : 1.2,
      scale = typeof extra.scale === 'number' ? extra.scale : 1,
      height = floating
        ? 0
        : Math.min(
            ...[
              [0, 0],
              [-1, 0],
              [1, 0],
              [0, -1],
              [0, 1],
            ].map(([x, z]) =>
              groundHeight(
                at,
                brew.size,
                offset[0] + x * footprint * scale,
                offset[2] + z * footprint * scale,
              ),
            ),
          ) - 0.025,
      seated: Vec3 = [offset[0], offset[1] + height, offset[2]];
    nodes.push({
      id,
      model,
      position: surfacePosition(at, brew.size, seated),
      rotation: surfaceRotation(at, brew.size),
      ...extra,
    });
    tiles.set(id, at);
  };
  const ownerModel = (handle: string | null): ModelName =>
    owner(handle).index < 0 ? 'ring' : (`owner${owner(handle).index % 4}` as ModelName);
  const venues = new Map(brew.venues.map((v) => [v.at, v])),
    plots = new Map((brew.plots ?? []).map((p) => [p.at, p]));
  for (let at = 0; at < grid.cells.length; at++) {
    const ground = brew.ground[at];
    if (ground >= 0 && !venues.has(at) && !plots.has(at))
      addNode(`ground_${at}`, groundModels[ground] ?? 'meadow', at, {
        tint: brew.visible.has(at) ? '#ffffff' : '#9b8da8',
      });
  }
  for (const venue of brew.venues) {
    const model =
      venue.kind === 'brewhouse'
        ? venue.level > 1
          ? 'brewhouse'
          : 'brewery'
        : venue.kind === 'festival'
          ? 'festival'
          : 'taproom';
    addNode(`venue_${venue.at}`, model, venue.at);
    addNode(
      `owner_${venue.at}`,
      ownerModel(venue.owner),
      venue.at,
      { tint: owner(venue.owner).color, scale: 0.85 },
      [0, 0.04, 0],
    );
    if (venue.fortification) addNode(`fortify_${venue.at}`, 'fortify', venue.at);
    if (
      venue.durability !== undefined &&
      venue.maxDurability &&
      venue.durability < venue.maxDurability
    )
      addNode(`damage_${venue.at}`, 'incident', venue.at, { scale: 0.75 }, [0.65, 0.8, 0.1]);
    for (let i = 0; i < Math.min(4, venue.level); i++)
      addNode(
        `level_${venue.at}_${i}`,
        'route',
        venue.at,
        { tint: owner(venue.owner).color, scale: 1.3 },
        [i * 0.28 - 0.28, 0.08, 1.1],
      );
    for (const [i, improvement] of (venue.improvements ?? []).entries()) {
      const model = { lab: 'yeastLab', warehouse: 'warehouse', garden: 'beerGarden' }[
        improvement
      ] as ModelName | undefined;
      if (model)
        addNode(`improvement_${venue.at}_${i}`, model, venue.at, { scale: 0.4 }, [
          -0.9 + i * 0.65,
          0.04,
          0.95,
        ]);
    }
  }
  for (const plot of brew.plots ?? []) {
    const model = {
      barleyField: 'barleyField',
      hopTrellis: 'hopTrellis',
      well: 'well',
      orchard: 'woodland',
    }[plot.kind] as ModelName;
    addNode(`plot_${plot.at}`, model, plot.at);
    addNode(
      `plot_owner_${plot.at}`,
      ownerModel(plot.owner),
      plot.at,
      { tint: owner(plot.owner).color, scale: 0.75 },
      [0, 0.03, 0],
    );
  }
  for (const ruin of brew.ruins ?? [])
    if (!venues.has(ruin.at)) addNode(`ruin_${ruin.at}`, 'ruins', ruin.at);
  for (const courier of brew.couriers) {
    const offset: Vec3 = venues.has(courier.at) ? [0.25, 0, 0.9] : [0, 0, 0];
    const route = paths?.get(courier.id),
      path: Vec3[] = [];
    if (route?.length)
      for (let i = 0; i < route.length; i++) {
        const from = i ? grid.cells[route[i - 1]].center : grid.cells[route[i]].center,
          to = grid.cells[route[i]].center;
        for (let step = 1; step <= 3; step++)
          path.push(
            multiply(
              normal(add(multiply(from, 1 - step / 3), multiply(to, step / 3))),
              grid.radius - 0.06,
            ),
          );
      }
    addNode(
      `courier_${courier.id}`,
      makers[courier.kind],
      courier.at,
      {
        transitionMs: Math.min(3000, Math.max(650, (route?.length ?? 1) * 300)),
        ...(path.length ? { path } : {}),
      },
      offset,
    );
    addNode(
      `courier_owner_${courier.id}`,
      ownerModel(courier.owner),
      courier.at,
      {
        tint: owner(courier.owner).color,
        scale: 0.3,
        transitionMs: 650,
        ...(path.length ? { path } : {}),
      },
      offset,
    );
    if (marks.ready.has(courier.id))
      addNode(`ready_${courier.id}`, 'route', courier.at, { tint: '#f6c35e', scale: 1.8 }, [
        offset[0],
        0.1,
        offset[2] + 0.4,
      ]);
  }
  for (const [i, at] of (marks.pending?.path ?? []).entries())
    addNode(`path_${i}`, 'route', at, { tint: '#f5c55f', scale: 1.7 }, [0, 0.13, 0]);
  for (const incident of (brew.incidents ?? []).filter((i) => i.round >= brew.round - 1))
    addNode(`news_${incident.at}`, 'incident', incident.at, { scale: 0.4 }, [-1, 0.1, -0.4]);
  return { nodes: [...new Map(nodes.map((n) => [n.id, n])).values()], tiles };
}
